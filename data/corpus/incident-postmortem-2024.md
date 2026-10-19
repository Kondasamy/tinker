Incident postmortem: Portal checkout outage, August 2024.

Summary: for 47 minutes on a Tuesday evening, customers could not complete checkout in the Portal. Carts and order history were unaffected.

Cause: a database connection limit was reached after a configuration change raised the number of background workers. Checkout requests waited for a connection and timed out.

Detection: the alert fired four minutes after the first failures. The on-call engineer was paged through the Duty Desk and acknowledged within six minutes.

Resolution: the configuration change was rolled back, and checkout recovered within two minutes.

Follow-ups: add a test that checks connection limits before configuration changes are deployed; add a checkout success rate to the main dashboard; update the support handbook so after-hours agents know how to page on-call.

Customer impact: about 130 orders were delayed. Customers who contacted support received a shipping credit.
