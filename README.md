# Asia LMS

Foundation for a learning management platform built with Next.js App Router,
TypeScript, MongoDB/Mongoose, NextAuth credentials authentication, bcrypt, and
Zod.

## Requirements

- Node.js 20.9 or newer
- npm
- MongoDB

## Setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local`.
3. Set `MONGODB_URI` and generate a private `AUTH_SECRET` (for example,
   `openssl rand -base64 32`).
4. Start MongoDB, then run `npm run db:check` to verify the connection.
5. Run `npm run dev` and open `http://localhost:3000`.

Public registration always creates a student. To create the initial
administrator, set `ADMIN_BOOTSTRAP_NAME`, `ADMIN_BOOTSTRAP_EMAIL`, and
`ADMIN_BOOTSTRAP_PASSWORD` in `.env.local`, then run `npm run create-admin`.
The setup command will not promote or overwrite an existing account.

## Foundation endpoints

- `POST /api/auth/register` — validated public student registration.
- NextAuth credentials routes at `/api/auth/*` — sign-in and sign-out.
- `GET /api/auth/me` — current active account; requires authentication.
- `GET /api/health` — application and MongoDB connectivity status.

Authorization for future protected API handlers is provided by
`lib/api-auth.ts`. It reads the authenticated account from MongoDB on each
request so disabled accounts and changed roles take effect immediately.

## Course discovery

Phase 2 adds public category and course catalog models, indexes, APIs, and
server-rendered pages. Public queries include courses in active categories with
published status only, are paginated on the server, and support search,
category, level, price, rating, and sorting filters.

- `GET /api/categories` — active categories and published course counts.
- `GET /api/courses` — filtered and paginated published courses.
- `GET /api/courses/[slug]` — a published course by its public slug.
- `/courses` and `/courses/[slug]` — public course discovery and details.

Course prices display in EGP, consistent with the Kashier integration. All
checkout totals are calculated on the server from active published courses;
browser-supplied prices are never accepted.

## Admin management

Administrators can manage courses, categories, and student account activation
from `/admin`. Course and student lists use server-side search and pagination.
Deleting a course archives it to preserve existing references, and categories
with associated courses cannot be deleted. Order reporting is read-only until
checkout and verified payment handling are implemented; administrator actions
cannot mark an unverified payment as paid.

- `/admin/courses` — create, edit, publish, search, and archive courses.
- `/admin/categories` — create, edit, enable, disable, and safely delete categories.
- `/admin/students` — search students and deactivate or reactivate accounts.
- `/admin/orders` — search and filter existing orders; payment status is read-only.
- `GET /api/admin/stats` — current student, course, and category counts.
- `GET /api/admin/orders` — protected, paginated order reports.
- `/api/admin/*` — protected management handlers requiring an active admin.

## Learning

Students can enroll directly only in published, free courses. Paid-course
enrollment remains blocked until the server verifies payment. Active enrollment
is required for protected lesson content, and progress updates are checked
against the student's own enrollment and the course's lesson IDs.

- `/dashboard` — learner profile and course overview.
- `/dashboard/courses` — the current student's active courses and progress.
- `/dashboard/courses/[courseId]` — protected course player.
- `/dashboard/orders` — orders belonging to the signed-in student.
- `/admin/courses/[id]/curriculum` — administrator section and lesson editor.
- `POST /api/enrollments` — free published courses only; paid enrollment is rejected.
- `GET /api/enrollments` — current student's enrollments only.
- `GET|PATCH /api/enrollments/[courseId]/progress` — enrollment-owned progress.
- `GET /api/courses/[slug]/curriculum` — public outline; only free lessons include content.
- `GET /api/courses/[slug]/lessons/[lessonId]` — free lessons or active-enrollee content.
- `GET /api/my-courses/[courseId]` — complete course content for an active enrollee.
- `/api/admin/courses/[id]/sections/*` and `/api/admin/courses/[id]/lessons/*` —
  protected curriculum management APIs.

## Checkout and Kashier payments

Configure the server-only `KASHIER_MODE`, `KASHIER_MERCHANT_ID`,
`KASHIER_SECRET_KEY`, `KASHIER_API_KEY`, and `KASHIER_PAYMENT_API_KEY`
environment variables. Use test credentials with `KASHIER_MODE=test` during
development. Never expose these values through `NEXT_PUBLIC_*` variables.

- `/cart` — browser cart; the server returns current catalog prices before checkout.
- `POST /api/cart/quote` — calculates an authenticated student's current cart quote.
- `POST /api/checkout` — validates active published paid courses, creates a
  pending order using database prices, and creates a Kashier payment session.
- `GET /api/orders` and `GET /api/orders/[orderId]` — current student's own orders.
- `POST /api/orders/[orderId]/verify` — verifies payment directly with Kashier;
  return-page query values are never treated as payment confirmation.
- `POST /api/payments/kashier/webhook` — validates the documented
  `x-kashier-signature` HMAC using the Payment API Key and idempotently fulfills
  verified `pay` events.

Paid course enrollments are only created after a matching, verified success
with the expected merchant order reference, amount, currency, and transaction
ID. Webhook delivery can be configured in Kashier or passed per payment session
when `NEXT_PUBLIC_APP_URL` is a public HTTPS origin. The checkout return page
also performs a server-side status verification.

## Validation

- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`
- `npm run db:check`
