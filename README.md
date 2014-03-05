toucheditor.js
==============

A rich HTML editor designed specifically to be easy to use on mobile touch devices.

**Project Status:** Stable, Under Development

**Known Issues:**
+ When applying a style or link, one space at the end of the last word is included. This will make an underline or strike-through extend too long.

**Upcoming Changes:**
+ More code cleanup


Demo
==============

+ Touch Editor: A demo is available in demo.html of this project and located on the Touch Editor home page [ http://ryangillespie.com/toucheditor.js/demo/ ].

+ Touch Editor Output: A demo is available in demo\_output.html of this project and located on the Touch Editor home page [ http://ryangillespie.com/toucheditor.js/demo_output/ ].


Documentation
==============
Documentation is available in the documentation/ folder of this project and located on the Touch Editor home page [ http://ryangillespie.com/toucheditor.js/docs/ ].


Usage: Initalize Touch Editor
==============

```
$(function() {
    TouchEditor.init("#touch-editor");
});
```


Usage: Touch Editor in a form
==============

```
$(function() {
    var $form = $("id-form");
    var $textarea = $("#id-textarea");

    TouchEditor.init($textarea);

    $form.on("submit", function(e) {
        $textarea.val(TouchEditor.getJSON());
    });
});
```


Usage: Touch Editor with pre-populated HTML
==============

```
$(function() {
    TouchEditor.init("#touch-editor", {
        'initJSON': '[[{"tag":"p","close":"1"},{"text":"Demo."},{"nodes":["p"]}]]'
    });
});
```


Usage: Touch Editor's JSON data as HTML on a page
==============

```
$(function() {
      var initJSON = '[[{"tag":"strong"},{"tag":"p","close":"1"},{"text":"Hello World"},{"nodes":["strong","p"]}]]';

			DOMWriter.setDomJSON(initJSON);
			var initHTML = DOMWriter.writeHTML();
			$("#id-html").html(initHTML);
});
```