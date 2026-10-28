;;; Code's immutable native Node programme constructor.  Systems consumes its
;;; typed product; neither construction nor receiving starts an application.
(define-module (native-code-programme)
  #:use-module (guix gexp)
  #:use-module (guix store)
  #:use-module (guix monads)
  #:use-module (guix derivations)
  #:use-module (ice-9 match)
  #:use-module (ice-9 regex)
  #:use-module (srfi srfi-1)
  #:use-module (srfi srfi-9)
  #:use-module (json)
  #:export (native-code-construction native-code-construction-input
            receive-native-code-output native-code-product-input native-code-product-entry
            native-code-product? native-code-product-binds-source?))

(define materializer
  (local-file (string-append (dirname (search-path %load-path "native-code-programme.scm"))
                            "/materialize-native-code-programme.mjs")
              "materialize-native-code-programme.mjs"))

(define-record-type <native-code-construction>
  (%construction input package entry)
  construction?
  (input native-code-construction-input)
  (package construction-package)
  (entry construction-entry))
(define-record-type <native-code-product>
  (%product input entry)
  product?
  (input native-code-product-input)
  (entry native-code-product-entry))

(define native-code-product? product?)
(define (native-code-product-binds-source? product source)
  (and (product? product) (string? source)
       (equal? source (native-code-product-input product))
       (equal? source (canonicalize-path source))))

(define (store-item path)
  (let ((m (and (string? path)
                (string-match "^(/gnu/store/[a-z0-9]{32}-[^/]+)(/.*)?$" path))))
    (unless m (error "selected registered native store input required" path))
    (let ((root (match:substring m 1)) (suffix (or (match:substring m 2) "")))
      (unless (and (equal? path (canonicalize-path path))
                   (not (member ".." (string-split suffix #\/))))
        (error "unredirected confined native store input required"))
      (with-store store
        (unless (valid-path? store root) (error "unregistered native input" root)))
      path)))

(define (regular-source path)
  (unless (and (string? path) (string-prefix? "/" path)
               (equal? path (canonicalize-path path)))
    (error "unredirected absolute native source input required"))
  path)

(define* (native-code-construction source entry
          #:key node-program parser-module policy-module bill-file incumbent-package guile-for-build)
  (regular-source source)
  (regular-source bill-file)
  (unless (and (eq? 'directory (stat:type (lstat source)))
               (string? entry) (not (string-prefix? "/" entry))
               (not (member ".." (string-split entry #\/)))
               (string? policy-module) (string? incumbent-package))
    (error "exact native programme source/entry/provider inputs required"))
  (let* ((bill (call-with-input-file bill-file json->scm))
         (package (assoc-ref bill "package"))
         (archives (assoc-ref bill "archives"))
         (providers (assoc-ref bill "providerInputs")))
    (unless (and (equal? "native-code-provider-bill/v1" (assoc-ref bill "kind"))
                 (list? package) (vector? archives) (> (vector-length archives) 0)
                 (<= (vector-length archives) 32) (vector? providers)
                 (> (vector-length providers) 0) (<= (vector-length providers) 8)
                 (any (lambda (root)
                        (and (string? root)
                             (string-prefix? (string-append root "/") incumbent-package)))
                      (vector->list providers)))
      (error "received bounded native provider bill required"))
    ;; Capture immutable registered providers as original Guix inputs.  The
    ;; programme contains no link to the mutable source or receiving directory.
    (let* ((node (store-item node-program))
           (parser (store-item parser-module))
           (roots (map store-item (vector->list providers)))
           (archive-inputs
             (map (lambda (a)
                    (let ((file (regular-source (assoc-ref a "archive"))))
                      (unless (eq? 'regular (stat:type (lstat file)))
                        (error "regular original archive required"))
                      (cons a (local-file file))))
                  (vector->list archives)))
           )
      ;; Tool selection is explicit in the bill; no machine-specific package
      ;; version or provider path is inferred by this generic Code constructor.
      (define tar
        (store-item (assoc-ref (assoc-ref bill "archiveExtractor") "module")))
      (define descriptor
        (scm->json-string
          (list (cons "version" 1) (cons "source" "") (cons "entry" entry)
                (cons "nodeProgram" node) (cons "parserModule" parser)
                (cons "policyModule" policy-module) (cons "tarModule" tar)
                (cons "bill" bill) (cons "output" ""))))
      (define input
        (computed-file "native-code-programme"
          #~(begin
              ;; A literal subpath is not itself a direct Guix store input.
              ;; Retain the selected Node root explicitly without reimporting
              ;; its tree or selecting another toolchain.
              (define node-input #$(match:substring
                  (string-match "^(/gnu/store/[^/]+)" node-program) 1))
              (define provider-inputs (list #$@roots))
              (call-with-output-file "native-code-input.json"
                (lambda (port) (display #$descriptor port)))
              (unless (zero?
                (apply system* #$node "--experimental-import-meta-resolve" #$materializer
                  "--guix-inputs" "native-code-input.json"
                  #$(local-file source #:recursive? #t) #$output
                  (list #$@(map cdr archive-inputs))))
                (error "native Code programme construction refused")))
          #:options (if guile-for-build
                        (list #:guile-for-build (read-derivation-from-file guile-for-build))
                        '())))
      (%construction input package
        (string-append "node_modules/" (assoc-ref package "name") "/" entry)))))

(define (receive-native-code-output construction output)
  (unless (construction? construction) (error "original Code construction required"))
  (with-store store
    (let* ((drv (run-with-store store
                  (lower-object (native-code-construction-input construction))))
           (expected (derivation->output-path drv)))
      (unless (and (equal? output expected) (valid-path? store output)
                   (equal? output (canonicalize-path output)))
        (error "native Code output differs from its original construction"))
      (let* ((receipt (call-with-input-file
                         (string-append output "/native-code-receiving.json") json->scm))
             (entry (construction-entry construction)))
        (unless (and (equal? "native-code-programme.received/v1" (assoc-ref receipt "kind"))
                     (equal? (construction-package construction) (assoc-ref receipt "package"))
                     (equal? entry (assoc-ref receipt "entry"))
                     (equal? #f (assoc-ref receipt "applicationExecuted"))
                     (file-exists? (string-append output "/" entry)))
          (error "native Code output lacks its original receiving"))
        (%product output entry)))))

