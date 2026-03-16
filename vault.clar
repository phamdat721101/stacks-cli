;; sBTC Vault - AI-powered yield optimization protocol
;; Tracks user sBTC deposits and emits events for rebalancing

(define-constant CONTRACT-OWNER tx-sender)
(define-constant ERR-NOT-OWNER (err u100))
(define-constant ERR-INSUFFICIENT-BALANCE (err u101))
(define-constant ERR-INVALID-AMOUNT (err u102))

(define-map balances principal uint)
(define-data-var total-value uint u0)

(define-public (deposit (amount uint))
  (begin
    (asserts! (> amount u0) ERR-INVALID-AMOUNT)
    (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))
    (map-set balances tx-sender
      (+ (default-to u0 (map-get? balances tx-sender)) amount))
    (var-set total-value (+ (var-get total-value) amount))
    (print { event: "deposit", user: tx-sender, amount: amount })
    (ok amount)))

(define-public (withdraw (amount uint))
  (let ((balance (default-to u0 (map-get? balances tx-sender))))
    (asserts! (> amount u0) ERR-INVALID-AMOUNT)
    (asserts! (>= balance amount) ERR-INSUFFICIENT-BALANCE)
    (try! (as-contract (stx-transfer? amount (as-contract tx-sender) tx-sender)))
    (map-set balances tx-sender (- balance amount))
    (var-set total-value (- (var-get total-value) amount))
    (print { event: "withdraw", user: tx-sender, amount: amount })
    (ok amount)))

(define-public (rebalance (weights (list 10 uint)))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-OWNER)
    (print { event: "rebalance", weights: weights })
    (ok true)))

(define-read-only (get-balance (user principal))
  (ok (default-to u0 (map-get? balances user))))

(define-read-only (get-total-value)
  (ok (var-get total-value)))
