<div align="center">

<img src="https://raw.githubusercontent.com/friedPotat0/Spam-Scores/master/images/icon-128px.png" alt="Spam Scores" width="88" height="88">

# Spam Scores

**See the spam score your mail server already gave each message, right inside Thunderbird.**

[![Thunderbird 115+](https://img.shields.io/badge/Thunderbird-115%2B-informational?logo=thunderbird&logoColor=white)](https://addons.thunderbird.net/thunderbird/addon/spam-scores/)
[![License: CC BY-NC-SA 4.0](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey)](https://creativecommons.org/licenses/by-nc-sa/4.0/)
[![Donate](https://img.shields.io/badge/Donate-Ko--fi-FF5E5B?logo=kofi&logoColor=white)](https://ko-fi.com/friedpotat0)

</div>

Spam Scores reads the spam and ham headers that common filters add to your mail, shows the total score with a colour-coded icon in a message-list column, and breaks that score down rule by rule in a popup. It does not classify mail itself; it surfaces the verdict your server already reached.

![Spam Scores in the message list](https://raw.githubusercontent.com/friedPotat0/Spam-Scores/master/images/screenshot.jpg)

It runs on Thunderbird 115 and later, and on the matching Betterbird releases. On Thunderbird 78, use [version 1.3.1](https://github.com/friedPotat0/Spam-Scores/releases/tag/1.3.1); older releases are on the [Releases page](https://github.com/friedPotat0/Spam-Scores/releases).

## Supported filters

Because Spam Scores only reads existing headers, it works whenever one of these filters has already tagged the message:

| Filter | Score is read from | Rule breakdown from |
| --- | --- | --- |
| SpamAssassin | `X-Spam-Status`, `X-Spam-Score` | `X-Spam-Report`, `X-Spam-hits` |
| rspamd | `X-Spamd-Result`, `X-Rspamd-Score`, `X-Rspam-Status` | `X-Spamd-Result`, `X-Rspamd-Report` |
| MailScanner | `X-<company>-MailScanner-SpamCheck` | same header |
| hMailServer | `X-hMailServer-Reason-Score` | `X-hMailServer-Reason-*` |
| Stalwart | `X-Spam-Score` | `X-Spam-Result` |
| Fastmail | `X-Spam-score` | `X-Spam-hits` |
| OVH (Vade Secure) | `X-VR-SPAMSCORE` | `X-VR-SPAMCAUSE` |
| Sophos PureMessage | `X-PMX-Spam` | `X-PMX-Spam` report |
| GMX | `X-GMX-Antispam` | - |

If a message carries none of these headers, there is nothing to show. Most large webmail providers strip them or never add them; providers that run open-source filters underneath, such as Fastmail, do keep them.

## What you see

Every message with a spam header gets a total score and a colour-coded icon:

- ![Spam](https://raw.githubusercontent.com/friedPotat0/Spam-Scores/master/images/score_positive.png) likely spam
- ![Neutral](https://raw.githubusercontent.com/friedPotat0/Spam-Scores/master/images/score_neutral.png) neutral
- ![Ham](https://raw.githubusercontent.com/friedPotat0/Spam-Scores/master/images/score_negative.png) likely ham

The score appears in the message-list column and, once you open a message, on a button in its toolbar. That button opens a popup that groups every matched rule by how it moved the score, each with its own partial score and, where the header provides one, a short description.

![Score breakdown popup](https://raw.githubusercontent.com/friedPotat0/Spam-Scores/master/images/screenshot_popup.png)

The Spam and Spam score columns appear automatically in folders you have not customised. In folders where you have already changed the columns, right-click the column header to enable them. If a column stays empty, restart Thunderbird once, then right-click the folder, choose "Properties" and "Repair Folder": this re-reads the headers of the mails already in that folder. Messages that arrive afterwards are picked up automatically.

For custom MailScanner headers such as `X-MYCOMPANY-MailScanner-SpamCheck`, open one affected message once before you restart and repair, otherwise those mails will not fill the column.

## Score ranges and icon colours

Different filters use very different scales: SpamAssassin and rspamd count in small signed points, OVH runs into the hundreds, and Sophos reports a percentage. Spam Scores keeps the raw value the filter reported and classifies the icon on that filter's own scale, so a low OVH or Sophos score is not mistaken for spam. Each scale has sensible defaults:

| Scale | Default neutral range |
| --- | --- |
| SpamAssassin, rspamd, MailScanner, hMailServer, Stalwart, Fastmail | -2 to 2 |
| OVH (Vade Secure) | 100 to 300 |
| Sophos PureMessage (probability) | 20% to 50% |

GMX is a special case: its number is a reason code, not a score, so a message counts as spam whenever the code is not zero.

## Options

![Settings](https://raw.githubusercontent.com/friedPotat0/Spam-Scores/master/images/screenshot_settings.jpg)

In the add-on settings you can adjust the icon range for each scale, and hide the icon and score for whole ranges, for example to flag only mail that is actually spam. The breakdown stays available in the popup regardless. You can also reorder the headers used for the score and for the breakdown, in case a message carries more than one.

## Installation

The version reviewed by Mozilla is on the [Thunderbird Add-on page](https://addons.thunderbird.net/thunderbird/addon/spam-scores/), or install it from inside Thunderbird under the menu button, "Add-ons", by searching for "Spam Scores". The same reviewed builds are attached to the [Releases page](https://github.com/friedPotat0/Spam-Scores/releases).

To try an unpublished version, download the files of any branch, zip the contents of the `Spam-Scores-[BRANCH_NAME]` folder, and drag the zip onto Thunderbird. You may stop receiving updates until you reinstall a reviewed build from the add-on page.

## Support this add-on

Spam Scores is free, and I develop it in my spare time. If it saves you time and you would like to help keep it maintained and moving forward, you can leave a tip:

[![Support me on Ko-fi](https://img.shields.io/badge/Support%20me%20on-Ko--fi-FF5E5B?logo=kofi&logoColor=white)](https://ko-fi.com/friedpotat0)

Contributing code, filters or translations, or simply leaving a review on the add-on page, helps every bit as much.

## Contributing

Found a bug? Please open an issue and include the relevant `X-...` spam headers of an affected mail, with any private parts redacted. I work on this in my spare time, so I cannot always fix things right away. Pull requests for bug fixes, new filters or translations are very welcome.

## License

Released under the [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) license.
