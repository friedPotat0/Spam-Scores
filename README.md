# Spam Scores

Spam Scores is a Thunderbird add-on that surfaces the spam score your mail server has already assigned to a message. It reads the spam and ham headers written by common filters, shows the total score together with a coloured icon in a mail-list column, and breaks that score down rule by rule in a popup.

It runs on Thunderbird 115 and later, and on the matching Betterbird releases. If you are still on Thunderbird 78, use version [1.3.1](https://github.com/friedPotat0/Spam-Scores/releases/tag/1.3.1); older releases for other versions are on the [Releases page](https://github.com/friedPotat0/Spam-Scores/releases).

![Spam Scores in the message list](https://raw.githubusercontent.com/friedPotat0/Spam-Scores/master/images/screenshot.jpg)

## Supported filters

Spam Scores does not classify mail itself. It reads the headers your server writes, so it only works when one of the filters below has already tagged the message. It currently understands:

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

If a message carries none of these headers, there is nothing to display. Most large webmail providers strip them or never add them in the first place; providers that run open-source filters underneath, such as Fastmail, do keep them.

## What you see

Every message that has a spam header gets a total score and a coloured icon:

- ![Positive](https://raw.githubusercontent.com/friedPotat0/Spam-Scores/master/images/score_positive.png) likely spam
- ![Neutral](https://raw.githubusercontent.com/friedPotat0/Spam-Scores/master/images/score_neutral.png) neutral
- ![Negative](https://raw.githubusercontent.com/friedPotat0/Spam-Scores/master/images/score_negative.png) likely ham

The score is also shown in the message-list column and, once you open a message, on a button in its toolbar. Clicking that button opens a popup that lists every rule the filter matched, each with its own partial score and, where the header provides it, a short description.

The Spam icon and Spam score columns appear automatically in folders you have not customised; in folders where you have already changed the columns, right-click the column header to enable them. If a column stays empty, restart Thunderbird once, then right-click the folder, choose "Properties" and "Repair Folder": this re-reads the headers of the mails already in that folder. Repeat for any folder where the columns stay empty. Messages that arrive afterwards are picked up automatically.

For custom MailScanner headers such as `X-MYCOMPANY-MailScanner-SpamCheck`, open one affected message once before you restart and repair, otherwise those mails will not fill the column.

## Score ranges and icon colours

Different filters use very different scales. SpamAssassin and rspamd count in small signed points, OVH runs into the hundreds, and Sophos reports a percentage. Spam Scores keeps the raw value the filter reported and classifies the icon on the scale of the filter it came from, so a low OVH or Sophos score is not mistaken for spam. Each scale has sensible defaults out of the box:

| Scale | Default neutral range |
| --- | --- |
| SpamAssassin, rspamd, MailScanner, hMailServer, Stalwart, Fastmail | -2 to 2 |
| OVH (Vade Secure) | 100 to 300 |
| Sophos PureMessage (probability) | 20% to 50% |

GMX is a special case: its number is a reason code, not a score, so a message counts as spam whenever the code is not zero.

## Options

![Settings](https://raw.githubusercontent.com/friedPotat0/Spam-Scores/master/images/screenshot_settings.jpg)

In the add-on settings you can change the icon range for each scale, and hide the icon and score for whole ranges, for example to only mark mail that is actually spam. The detailed rules stay available in the popup regardless of that setting. You can also reorder the headers that are used for the score and for the breakdown, in case a message carries more than one.

## Installation

The version reviewed by Mozilla is available on the [Thunderbird Add-on page](https://addons.thunderbird.net/thunderbird/addon/spam-scores/), or from inside Thunderbird under the menu button, "Add-ons", by searching for "Spam Scores". The same reviewed builds are attached to the [Releases page](https://github.com/friedPotat0/Spam-Scores/releases).

To try a version that has not been published yet, download the files of any branch, zip the contents of the `Spam-Scores-[BRANCH_NAME]` folder, and drag the zip onto Thunderbird to install it. You may stop receiving updates until you reinstall a reviewed build from the add-on page.

## Contributing

If you run into a bug, please open an issue and include the relevant `X-...` spam headers of an affected mail (with any private parts redacted). I work on this in my spare time, so I cannot always fix things right away. Pull requests for bug fixes, new filters or translations are very welcome.

## License

Released under the [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) license.
