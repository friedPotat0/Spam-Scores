# Spam Scores (Thunderbird Add-on)

Spam Scores is an add-on for Thunderbird (Version 78.0a1 - *). It can display spam scores according to mail headers. The add-on supports spam/ham score headers of Rspamd and SpamAssassin. It adds a column with the overall spam score to the mail list view and shows details of any matched spam/ham rule.

![Add-on Screenshot](https://raw.githubusercontent.com/friedPotat0/Spam-Scores/master/images/screenshot.jpg)

To display the spam score column, right-click on the title bar of the columns in the list view and select "Spam score".

The total score of each mail with an existing spam header will be displayed along with a red, yellow or green icon depending on the score. The colours are calculated as follows:
<ul>
<li>Red: Score greater than 2</li>
<li>Yellow: Score between -2 and 2 (both inclusive)</li>
<li>Green: Score less than -2</li>
</ul>

Furthermore, a button is displayed in the action bar of any opened mail with the respective total score of the mail. Clicking on the button opens a popup with detailed information on all individual rules. In addition to the name and the partial score, a description and, if available in the mail header, the value on the basis of which the score was calculated is displayed.

## Contributing

If you notice any bugs, do not hesitate to open an issue about it. Please understand that I develop the add-on in my spare time and may not be able to solve problems directly. If you want to contribute to the project by fixing bugs or implementing new features, please feel free to open a pull request.
