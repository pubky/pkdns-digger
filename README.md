# PKARR DIG

Find your piece of digital sovereignty

```bash
npm run dev
```

## PKARR relays

By default, the app uses the relay list provided by the PKARR library. To use custom relays, set `NEXT_PUBLIC_PKARR_RELAYS` to a comma-separated list:

```bash
NEXT_PUBLIC_PKARR_RELAYS=https://relay1.example,https://relay2.example npm run dev
```

The settings button in the site header can override this relay list for the current browser. Browser settings are stored in `localStorage`; resetting them restores `NEXT_PUBLIC_PKARR_RELAYS`, or the PKARR defaults when the environment variable is unset.

