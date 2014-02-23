/*
 * Touch HTML Editor 0.1 - Rich HTML editor for touch screen devices
 * License: MIT License
 *
 * For a complete explanation, including examples and demos, visit:
 * http://ryangillespie.com/toucheditor.js/
 *
 * View and fork on GitHub:
 * https://github.com/snapshotist/toucheditor.js
 *
 * Dependencies: JQuery 1.10+, DOMWriter 0.1+
 *
 * Options:
 *      noToolbarFollow : boolean
 *
*/
var TouchEditor = (function(){
    
    var supportedTags = [
        {
            "tag": "a",
            "classname": "link",
            "label": "Link"
        },
        {
            "tag": "strong",
            "classname": "bold",
            "label": "Bold"
        },
        {
            "tag": "u",
            "classname": "underline",
            "label": "Underline"
        },
        {
            "tag": "em",
            "classname": "italic",
            "label": "Italic"
        },
        {
            "tag": "strike",
            "classname": "strike",
            "label": "Strike"
        }
    ];

    var editorToolsHTML = '<div class="touch-edit-toolbar">';
    for (var i = -1; i++ < supportedTags.length - 1;) {
        editorToolsHTML += '<button class="touch-edit-button touch-edit-' + supportedTags[i]["classname"] + '" data-tag="' + supportedTags[i]["tag"] + '">' + supportedTags[i]["label"] + '</button>';
    }
    editorToolsHTML += '<button class="touch-edit-button touch-edit-help" style="display: none;">Help</button></div>';

    var editorApplyHTML = '<ul class="touch-edit-top-nav" style="display: none;"><li class="list-urls"><button><span class="down-arrow"></span></button><select></select></li><li class="url"><span class="touch-edit-label"></span><input type="text" autocorrect="off" autocapitalize="off" placeholder="Type the link address"></li><li class="apply"><button>Apply</button></li><li class="close"><button>Cancel</button></li></ul>';

    var editorHTML = '<div class="touch-edit"></div>';
    var $text;

    function init(target, options) {

        var $formInput;
        if (typeof target == "string") {
            $formInput = $(target);
        } else {
            $formInput = target;
        }
        var scrollInterval;

        if (!$formInput.length) {
            console.error("Target not found: " + target);
            return;
        } else {
            $(editorHTML).insertAfter($formInput);
            $text = $(".touch-edit");
        }

        if (typeof options === "undefined") {
            options = {};
        }

        if (options["initJSON"]) {
            DOMWriter.setDomJSON(options["initJSON"]);
            var initHTML = DOMWriter.writeHTML();
            $text.html( initHTML );
        }

        $text.attr("contenteditable", "true");
        editorToolsHTML = $(editorToolsHTML).insertBefore($text);

        $(editorApplyHTML).appendTo("body");

        $formInput
            .css("opacity", 0)
            .css("width", "1px")
            .css("height", "1px")
            .css("margin", "0")
            .appendTo(editorToolsHTML);

        function stopToolbarScroll() {
            clearInterval(scrollInterval);
        }

        function startToolbarScroll() {
            var editorTop = $text.offset().top;
            var editorTopRel = $text.position().top;
            var toolsHeight = editorToolsHTML.height();
            var fixed = false;

            scrollInterval = setInterval(function() {
                var scrollTop = $(window).scrollTop();
                var editorHeight = $text.height();

                if (editorHeight > toolsHeight) {

                    if (scrollTop >= editorTop) {

                        var editorBottom = (editorTop + editorHeight) - toolsHeight;
                        if (scrollTop >= editorBottom) {
                            if (!fixed) {
                                var toolsAbsPos = (editorTopRel + editorHeight) - toolsHeight + 20;
                                fixed = true;

                                editorToolsHTML
                                    .removeClass("scroll")
                                    .addClass("scroll-end")
                                    .css("top", toolsAbsPos + "px");
                            }
                        } else {
                            fixed = false;
                            editorToolsHTML
                                .css("top", "")
                                .removeClass("scroll-end")
                                .addClass("scroll");
                        }

                    } else if (scrollTop < editorTop) {
                        editorToolsHTML.removeClass("scroll");
                        editorToolsHTML.removeClass("scroll-end");
                    } else {
                        editorToolsHTML.removeClass("scroll");
                    }
                }
            }, 250);
        }

        if (!options["noToolbarFollow"]) {
            editorToolsHTML.parent().css("position", "relative");
            startToolbarScroll();
        }

        // Force P tag on Chrome when hitting enter - default is DIV
        $text.get(0).addEventListener('keypress', function(ev){
            if(ev.keyCode == '13')
                document.execCommand('formatBlock', false, 'p');
        }, false);

        var originalHTML;

        var selectedNodes = [];
        var selectedHref = "";
        var tagMode = {};

        // disable links - iOS Safari
        $text.find("a").on("click", function(e) {
            e.preventDefault();
        });

        function resetTools() {
            editorToolsHTML.find(":not(.touch-edit-help)").show();
            editorToolsHTML.find(".touch-edit-help").hide();

            // reset input controls
            $(".list-urls").find("option[value='']").attr("selected", "selected");
            $(".url input").val("");
        }

        function enableNav() {

            editorToolsHTML.find(":not(.touch-edit-help)").hide();
            editorToolsHTML.find(".touch-edit-help").show();

            $(".touch-edit-top-nav").show();
            $text.attr("contenteditable", "false");

            $(".close").on("click", function(e) {
                e.preventDefault();
                $text.html( originalHTML );
                removeHandlers();
                resetTools();
            });

            $(".apply").on("click", function(e) {
                e.preventDefault();

                var updatedLinks = false;

                if (tagMode.name == "a") {
                    var hrefInput = $(".url").find("input").val().replace(" ", "");
                    if (hrefInput.length == 0) {
                        alert("You must type a link address at the top.");
                        return;
                    } else {
                        tagMode["attributes"]["href"] = hrefInput;

                        if (selectedHref != hrefInput) {
                            // update href attribute for pre-existing linked nodes
                            var idArray = [];
                            $text.find(".selected:not(.addNode)").each(function(idx) {
                                var jsonNodeId = parseInt($(this).parent().attr("id").substr(2), 10);
                                if ( $.inArray(jsonNodeId, idArray) == -1 ) {
                                    idArray.push(jsonNodeId);
                                }
                            });
                            if (idArray.length) {
                                DOMWriter.updateAttributes(idArray, "a", tagMode["attributes"]);
                                updatedLinks = true;
                            }
                        }
                    }
                }

                var affectedNodes = findNodes(tagMode.name, tagMode.attributes);

                if (!updatedLinks && affectedNodes == 0) {
                    var msg = "You must tap on a word to apply ";
                    if (tagMode.name == "a") {
                        msg += "the link.";
                    } else {
                        msg += "the style."
                    }
                    alert(msg);
                    return;
                }

                removeHandlers();
                if (updatedLinks || affectedNodes) {
                    $text.html( DOMWriter.writeHTML() );
                    // disable links - iOS Safari
                    $text.find("a").on("click", function(e) {
                        e.preventDefault();
                    });
                } else {
                    $text.html( originalHTML );
                }

                resetTools();
            });

            if (tagMode["name"] == "a") {
                $(".url").find("input")
                    .css("opacity", 1)
                    .removeAttr("disabled");

                $(".list-urls")
                    .find("*").show()
                    .on("change", function() {
                        var hrefLookup = $(this).find("option:selected").val();
                        $(".url input").val(hrefLookup);
                        activateLinks(hrefLookup);
                        selectedHref = hrefLookup;
                    });

            } else {
                $(".list-urls")
                    .off("change")
                    .find("*").hide();
                $(".url").find("input")
                    .css("opacity", 0)
                    .attr("disabled", "disabled");
            }
        }

        function findNodes(tagName, tagAttributes) {

            var selectedNodes = $text.find(".addNode,.removeNode");
            var groupedNodes = [];
            var previousGrouped = false;
            var jsonNodeId;
            var jsonNodeIdShift = 0;

            var thisNode = $(selectedNodes[0]);
            groupedNodes.push(thisNode);

            for (var i = -1; i++ < selectedNodes.length - 1;) {
                thisNode = $(selectedNodes[i]);
                var nextNode = $(selectedNodes[i + 1]);

                if (nextNode.length && thisNode.next().attr("id") == nextNode.attr("id")) {
                    groupedNodes.push(nextNode);
                } else {
                    jsonNodeId = parseInt(groupedNodes[0].parent().attr("id").substr(2), 10) + jsonNodeIdShift;
                    textNodeNumber = groupedNodes[0].prevUntil(':not(span:not(:empty))').length;
                    totalNodeCount = groupedNodes[0].parent().children(':not(:empty)').length;

                    // flip index position of text node to be from the end of nodes list
                    textNodeNumber = totalNodeCount - textNodeNumber;

                    var nodesChanged;
                    if (thisNode.hasClass("addNode")) {
                        nodesChanged = DOMWriter.addTag(jsonNodeId, textNodeNumber, groupedNodes.length, tagName, tagAttributes);
                    } else if (thisNode.hasClass("removeNode")) {
                        nodesChanged = DOMWriter.removeTag(jsonNodeId, textNodeNumber, groupedNodes.length, tagName);
                    }

                    // 2 new nodes might be added by DOMWriter, so index for any subsequent text nodes
                    // would be increased by 2
                    jsonNodeIdShift += nodesChanged;

                    groupedNodes = [nextNode];
                }
            }

            return selectedNodes.length;
        }

        function disableNav() {
            $(".close").off("click");
            $(".apply").off("click");
            $(".touch-edit-top-nav").hide();

            $text.attr("contenteditable", "true");
        }

        function activateLinks(hrefLookup) {

            // reset any previously activated links
            if (selectedNodes.length) {
                selectedNodes
                    .removeClass("selected")
                    .data("href", selectedHref)
                    ;
            }

            if (hrefLookup.length) {
                $text.find("a").find("span > span").each(function(index) {
                    if ($(this).data("href") == hrefLookup) {
                        $(this)
                            .addClass("selected")
                            .removeData("href")
                            ;
                    }
                });
            }
            selectedNodes = $text.find(".selected");
        }

        function selectTags(tagName) {

            // reset any previously selected text nodes
            if (selectedNodes.length) {
                selectedNodes.removeClass("selected");
            }

            $text.find(tagName).find("span > span").addClass("selected");
            selectedNodes = $text.find(".selected");
        }

        function enableInteractiveMode() {
            originalHTML = $text.html();

            DOMWriter.parseHTML($text, {
                "idNodes": true
            });

            enableNav();
            wrapTextNodes($text.find('*'));

            // highlight text nodes with this chosen tag
            if (tagMode.name != "a") {
                selectTags(tagMode.name);
                
                $(".touch-edit-label").text("Style: " + tagMode["label"]);

            } else {
                $(".list-urls").find("select").html('<option value="">Add a New Address</option>');

                var uniqueHref = [];
                var optionHtml = "";
                // store initial href for links and disable the link
                $text.find('a')
                    .each(function(index) {
                        var $spans = $(this).find('span:not(:empty)');
                        var href = $(this).attr("href");
                        $spans.each(function() {
                            $.data(this, "href", href);
                        });

                        if ($.inArray(href, uniqueHref) == -1) {
                            uniqueHref.push(href);
                            optionHtml += '<option value="' + href + '">' + href + '</option>';
                        }
                    })
                    .on("click", function(e) {
                        e.preventDefault();
                    });

                $(".list-urls").find("select").append(optionHtml);
            }

            $text.addClass("enabled");
        }

        $(".touch-edit-button").on("click", function(e) {
            e.preventDefault();

            if( $text.text().length == 0) {
                alert("You must type something before you can apply links and styles.");
                return;
            }

            if ($(this).hasClass("touch-edit-help")) {

                var msg;
                if (tagMode["name"] == "a") {
                    msg = "Touch a word to apply the link. Touch again to remove.\nType the link address in the text box above or choose from the drop-down button.";
                } else {
                    msg = "Touch a word to apply the style. Touch again to remove.";
                }

                msg += "\n\nClick Apply at the top right when done.";
                alert(msg);

                return;
            }

            tagMode["name"] = $(this).data("tag");
            if (tagMode["name"] == "a") {
                tagMode["attributes"] = {
                    "href": ""
                };
            } else {
                tagMode["label"] = $(this).text();
                tagMode["attributes"] = {};
            }

            enableInteractiveMode();
        });

        function wrapTextNodes(nodeSet) {

            nodeSet.each(function(index) {

                var wrapNodes = [];

                element = $(this).get(0);
                for (var child = element.firstChild; child !== null; child = child.nextSibling) {
                    if (child.nodeType === 3) {

                        child.data = child.data.replace("\n", "");
                        var spaceChar = child.data.length == 1 && child.data == " ";
                        if (!spaceChar) {
                            child.data = child.data
                                .replace(/>/g, "&gt;")
                                .replace(/</g, "&lt;");
                            wrapNodes.push(child);
                        }
                    }
                }

                for (var i = wrapNodes.length; i-- > 0;) {
                    var text = wrapNodes[i].data;

                    if (text != "\n") {
                        var result = '<span class="click">' + text.replace(/ /g, '</span> <span class="click">')  + '</span>';

                        var frag = document.createDocumentFragment(),
                            tmp = document.createElement('body'), child;
                            tmp.innerHTML = result;
                        while (child = tmp.firstChild) {
                            frag.appendChild(child);
                        }
                        wrapNodes[i].parentNode.replaceChild(frag, wrapNodes[i]);
                        frag = tmp = null;
                    }
                }

            });

            var nodeCount = 0;
            $text.find(".click").each(function(index) {

                // Add consecutive ID numbers to all clickable text nodes
                // Used for "flat" traversal up/down of the DOM tree
                if ($(this).text() != "") {
                    $(this).attr("id", "i" + nodeCount++);
                }

                // add click handler
                $(this).on("click", function(e) {

                    $(this).toggleClass("selected");
                    var selectionAdded = $(this).hasClass("selected");

                    if (selectionAdded) {
                        if ( !$(this).hasClass("addNode") && !$(this).hasClass("removeNode") ) {
                            $(this).addClass("addNode");
                        } else {
                            if ($(this).hasClass("addNode"))
                                $(this).removeClass("addNode");
                            if ($(this).hasClass("removeNode"))
                                $(this).removeClass("removeNode");
                        }

                    } else {
                        if ( !$(this).hasClass("addNode") && !$(this).hasClass("removeNode") ) {
                            $(this).addClass("removeNode");
                        } else {
                            if ($(this).hasClass("addNode"))
                                $(this).removeClass("addNode");
                            if ($(this).hasClass("removeNode"))
                                $(this).removeClass("removeNode");
                        }
                    }

                }); // on "click"

            }); // find .click
        }

        function removeHandlers() {
            $nodes = $text.find(".click");
            $nodes.contents().unwrap();
            $nodes.remove();
            $text.removeClass("enabled");
            $(".list-urls").find("*").off("change");

            disableNav();
        }

    }

    function getJSON(stringify) {
        var jsonResult = DOMWriter.parseHTML($text);
        if (stringify) jsonResult = JSON.stringify(jsonResult);
        return jsonResult;
    }

    function getHTML() {
        return $text.html();
    }

    return {
        init: init,
        getJSON: getJSON,
        getHTML: getHTML
    };

})();