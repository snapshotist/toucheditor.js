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
*/
var TouchEditor = (function(){

    function init() {

        var originalHTML;
        var pointers = [];
        var lastPointer = 0;

        var $text = $(".linkify");
        var selectedNodes = [];
        var selectedNodesPointer = [];
        var selectedHref = "";
        var tagMode = {};

        function enableNav() {

            $(".top-nav").show();
            $text.attr("contenteditable", "false");

            $(".close").on("click", function(e) {
                $text.html( originalHTML );
                removeHandlers();
            });

            $(".apply").on("click", function(e) {

                var updatedLinks = false;

                if (tagMode.name == "a") {
                    var hrefInput = $(".url").find("input").val().replace(" ", "");
                    if (hrefInput.length == 0) {
                        alert("Link address cannot be empty.")
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

                removeHandlers();
                if (updatedLinks || affectedNodes) {
                    $text.html( DOMWriter.writeHTML() );
                } else {
                    $text.html( originalHTML );
                }

                // reset input controls
                $(".list-urls").find("option[value='']").attr("selected", "selected");
                $(".url input").val("");
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
                        clearPointers();
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
            $(".top-nav").hide();

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
            clearPointers();
            wrapTextNodes($text.find('*'));

            // highlight text nodes with this chosen tag
            if (tagMode.name != "a") {
                selectTags(tagMode.name);

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
                            $.data( this, "href", href);
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

        $(".linkify-button").on("click", function(e) {
            e.preventDefault();

            tagMode["name"] = $(this).data("tag");
            if (tagMode["name"] == "a") {
                tagMode["attributes"] = {
                    "href": ""
                };
            } else {
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

                    lastPointer = pointers[pointers.length - 1];
                    if (lastPointer === undefined)
                        lastPointer = 0;
                    var nextPointer;

                    var thisId = parseInt($(this).attr("id").substr(1));
                    var prevNode = $("#i" + (thisId - 1));
                    var nextNode = $("#i" + (thisId + 1));

                    var prevNodeClass;
                    var nextNodeClass;
                    if (prevNode.length)
                        prevNodeClass = prevNode.attr("class").match(/[0-9]+/g);
                    if (nextNode.length)
                        nextNodeClass = nextNode.attr("class").match(/[0-9]+/g);

                    if (prevNodeClass)
                        if (nextNodeClass)
                            if (prevNodeClass < nextNodeClass)
                                nextPointer = prevNodeClass;
                            else
                                nextPointer = nextNodeClass;
                        else
                            nextPointer = prevNodeClass;
                    else if (nextNodeClass)
                        nextPointer = nextNodeClass;

                    if (selectionAdded) {

                        if (prevNodeClass) {
                            if (nextNodeClass) {
                                $(this).addClass("linkify-" + prevNodeClass);

                                var nextNodeCounter = thisId + 1;
                                var inspectNode = $("#i" + (nextNodeCounter++));

                                while(inspectNode.hasClass("linkify-" + nextNodeClass)) {
                                    inspectNode.removeClass("linkify-" + nextNodeClass);
                                    removePointer(nextNodeClass);
                                    inspectNode.addClass("linkify-" + prevNodeClass);

                                    inspectNode = $("#i" + (nextNodeCounter++));
                                }

                            } else {
                                $(this).addClass("linkify-" + prevNodeClass);
                            }
                        } else if (nextNodeClass) {
                            $(this).addClass("linkify-" + nextNodeClass);
                        } else {
                            nextPointer = addPointer();
                            $(this).addClass("linkify-" + nextPointer);
                        }


                    } else {
                        var thisClass = $(this).attr("class").match(/[0-9]+/g);
                        $(this).removeClass("linkify-" + thisClass);

                        if (prevNodeClass) {
                            if (nextNodeClass) {
                                var newNextNodeClass = addPointer();

                                var nextNodeCounter = thisId + 1;
                                var inspectNode = $("#i" + (nextNodeCounter++));

                                while(inspectNode.hasClass("linkify-" + nextNodeClass)) {
                                    inspectNode.removeClass("linkify-" + nextNodeClass);
                                    inspectNode.addClass("linkify-" + newNextNodeClass);

                                    inspectNode = $("#i" + (nextNodeCounter++));
                                }

                            }
                        } else if (!nextNodeClass) {
                            removePointer(thisClass);
                        }
                    }

                }); // on "click"

            }); // find .click
    
        }

        function addPointer() {
            var newPointer = lastPointer + 1;
            pointers[pointers.length] = newPointer;
            return newPointer;
        }

        function removePointer(removeVal) {
            pointers = jQuery.grep(pointers, function(value) {
                return value != removeVal;
            });
        }

        function clearPointers() {
            if (pointers.length) {
                for (var i = pointers.length; i-- > 0;) {
                    $text.find(".linkify-" + pointers[i]).removeClass("selected linkify-" + pointers[i]);
                }
            }
            pointers = [];
            lastPointer = 0;
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

    return {
        init: init
    };

})();