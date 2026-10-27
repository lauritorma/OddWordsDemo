# Privacy implementation and publisher checklist

Reviewed against Vercel documentation on **27 October 2026**. The repository
was inspected; the publisher's Vercel account and deployed site were not
available for inspection.

## What is verified in the code

The application fetches its own phrase list, daily schedule and local English
dictionary. It does not send typed guesses, round results or settings to a
server. It has no account, analytics SDK, advertising pixel, session recorder,
remote font, or microphone integration. Sounds are generated with Web Audio.

The one application storage key is `odd-words:v1`. It includes active rounds,
drafts, selected mode/cursor, the remaining freeplay bag, preferences and up
to 1,000 completed results. It has no automatic expiry. No app cookies are set.
Local storage is not automatically sent as part of HTTP requests.

The privacy page and Settings both offer confirmed deletion of this key only.
They do not call `localStorage.clear()`. Other open game tabs handle storage
removal events and reset their in-memory state, preventing stale state from
being immediately written back by those tabs. New interaction or a page reload
can create a new save. Hosting records cannot be deleted by this button.

External reference links are user-initiated. Result sharing uses the clipboard
only after a click. Local and Vercel response configuration use
`Referrer-Policy: no-referrer`; the HTML includes the equivalent meta policy.
The Vercel configuration restricts script/network sources and disables camera,
microphone and geolocation permissions. It does not configure Vercel's account-
level logging or security services.

## What Vercel documents

Ordinary hosting is not the same as optional Web Analytics. Vercel receives
request IP addresses, offers request/security observability, and creates CDN
request events for static assets. Log records can contain timestamps, paths,
status, user agents, referrers and client IPs. Vercel describes approximate
location derived from IP addresses and international processing. Vercel's DPA
covers processor obligations and applicable transfer mechanisms.

Web Analytics and Speed Insights are separate products with their own setup
and privacy documentation. Neither is integrated into the supplied game.
Do not interpret that as a claim that every Vercel deployment processes no
visitor data, or that dashboard integrations can be established from source.

There is no verified project-specific retention period. Retention and access
vary by service, plan, configuration and any log exports. A runtime-log
retention period is not a universal promise for CDN/security records. The
public notice deliberately does not claim that all records disappear after
a specific number of hours or days.

## Before publishing

1. Set `operatorName` and `privacyEmail` in `src/site-config.js`. Use an actual
   public operator identity and monitored contact address. The build embeds
   both into `dist/privacy.html`, including for visitors without JavaScript.
   A build warning is intentional while these fields are blank.
2. Review your real Vercel project: Web Analytics, Speed Insights, observability,
   firewall/security checks, deployment protection, toolbar injections, log
   drains and third-party integrations. The supplied notice must match what
   actually runs. Do not add analytics while leaving a no-analytics statement.
3. Confirm the applicable retention for enabled services and exported logs.
   Replace the notice's unverified-retention statement with accurate details
   when established; do not guess a universal value.
4. Confirm your applicable lawful basis, storage/consent obligations, rights
   procedure, jurisdiction-specific disclosures and international-transfer
   arrangements. The supplied notice is a technical disclosure, not a blanket
   GDPR/ePrivacy compliance certification. A lack of advertising cookies alone
   does not settle these obligations.
5. Run `npm run verify`, deploy, then inspect the live site's Network and Storage
   panels in a fresh browser profile. Test the privacy link, contact, local
   deletion and response headers. The development browser harness cannot audit
   your live Vercel account or any host-injected behavior.

The only required public contact configuration is in `src/site-config.js`.
Other deployment-specific changes should be made to `privacy.html` itself.
Never put credentials into browser-shipped configuration.

## Sources

- Vercel Privacy Notice (updated 1 June 2026):
  https://vercel.com/legal/privacy-notice
- Vercel request headers, including client IP and geolocation headers:
  https://vercel.com/docs/headers/request-headers
- Vercel Observability, including events for static CDN requests:
  https://vercel.com/docs/observability
- Log drain schema and static request sources:
  https://vercel.com/docs/drains/reference/logs
- Firewall and security checks:
  https://vercel.com/docs/vercel-firewall
- Data Processing Addendum:
  https://vercel.com/legal/dpa
- Web Analytics privacy and setup distinction:
  https://vercel.com/docs/analytics/privacy-policy
- Speed Insights privacy and setup distinction:
  https://vercel.com/docs/speed-insights/privacy-policy

These documents describe the provider, not evidence of the publisher's actual
plan, account configuration, log-export destination or retention settings.
