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
A demo is available in demo.html of this project and located on the Touch Editor home page [ http://ryangillespie.com/toucheditor.js/demo/ ].


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
        $textarea.val(TouchEditor.getHTML( $textarea ));
    });
});
```