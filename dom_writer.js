/*
 * DOMWriter 0.1 - JSON data modeled HTML
 * License: MIT License
 *
 * DOMWriter converts between HTML and a JSON data model.
 * Each text node is grouped by the unique set of tags that wrap
 * the text, creating a "flat" view of the HTML. This "flat" view
 * of the HTML allows easy manipulation of the tags per text node
 * by eliminating any "nested" dependencies within the data model.
 *
 * For a complete explanation, including examples and demos, visit:
 * http://ryangillespie.com/domwriter/
 *
 * Dependencies: JQuery 1.10+
 *
*/
var DOMWriter = (function(){

    // prevent xss
    var validTags = ["a", "strong", "u", "em", "strike", "p", "br", "hr", "blockquote", "div"];

    var options;

    var domJSON = [];
    var htmlTree = [];
    var tagArray = [];
    var ignoredFirstNode = false;
    var textNodeCnt = 0;
    var blockTags = ["p", "blockquote"];
    var blockTag = "";

    var html = "";
    var anchorIdx; // for quick retrieval if needed
    
    var noChanges = false;
    
    var firstBlock = false;

    function parseHTML(domWrapper, initOptions) {
        if (typeof initOptions === "undefined") {
            options = {
                "idNodes": false
            };
        } else {
            options = initOptions;
        }

        domJSON = [];
        htmlTree = [];
        tagArray = [];
        ignoredFirstNode = false;
        textNodeCnt = 0;    
        html = "";
        noChanges = false;
        firstBlock = false;
        blockTag = "";

        buildJSON(domWrapper.get(0));
        
        return domJSON;
    }


    function buildJSON(node) {
        var canWrap = false;
        var tagName;
        if (node.tagName)
            tagName = node.tagName.toLowerCase();

        // if this a text or br/hr node, it has no children or open/close tags
        if(node.nodeType == 3 || tagName == "br" || tagName == "hr") {

            var nodeText = "";
            if (tagName == "br") {
                nodeText = "<br>";
            } else if (tagName == "hr") {
                nodeText = "<hr>";
            } else {
                // if this node is all whitespace, don't report it
                if(node.data.replace(/\s/g,'') == '') { return; }

                nodeText = node.data;
                canWrap = true;
            }

            htmlNode = {
                "text": nodeText
            };
            htmlTree.push(htmlNode);

            htmlNode = {
                "nodes": tagArray
            };
            htmlTree.push(htmlNode);

            if (canWrap && options.idNodes) {
                $(node).wrap('<span id="n-' + (textNodeCnt++) + '"></span>');
            } else {
                // Even though not wrapped, these are included in domJSON.
                // Must increment counter to maintain proper references to wrapped nodes.
                textNodeCnt++;
            }

            var saveHtml = $.extend(true, [], htmlTree);

            // is the block tag wrapping the text node the first instance of the tag?
            // if not, don't inform writeHTML to close and re-open the tag.
            if (!firstBlock && blockTag.length) {
                var idx = $.inArray(blockTag, tagArray);
                if (idx != -1)
                    delete saveHtml[idx]["close"];
            }
            firstBlock = false;

            domJSON.push(saveHtml);
            htmlTree.pop(); // remove "nodes"
            htmlTree.pop(); // remove "text"

            return;
        }

        if (tagName != "br" && tagName != "hr") {

            // ignore the element that wraps all of the HTML we're converting
            if (ignoredFirstNode) {

                htmlNode = {
                    "tag": tagName
                };

                if (tagName == "a") {
                    var href = $(node).attr("href");
                    htmlNode["attrs"] = {
                        "href": href
                    };
                    tagArray.push("a:" + href);
                } else {
                    tagArray.push(tagName);

                    var blockTagIdx = $.inArray(tagName, blockTags);
                    if ( blockTagIdx != -1) {
                        firstBlock = true;
                        blockTag = tagName[blockTagIdx];

                        htmlNode["close"] = "1";
                    }
                }
                htmlTree.push(htmlNode);
                var saveHtml = $.extend(true, [], htmlTree);

            } else {
                ignoredFirstNode = true;
            }

            // parse the child nodes of this node
            for(var i = 0; i < node.childNodes.length; ++i) {
                buildJSON(node.childNodes[i]);
            }

            htmlTree.pop();
            tagArray.pop();
        }
    }

    function updateAttributes(elementIds, tagName, tagAttributes) {
        for (var i = -1; i++ < elementIds.length - 1;) {
            var tags = domJSON[elementIds[i]];
            for (var x = -1; x++ < tags.length - 1;) {
                if (tags[x]["tag"] == tagName) {
                    tags[x]["attrs"] = tagAttributes;
                    if (tagName == "a") {
                        tags[tags.length - 1]["nodes"][x] = tagName + ":" + tagAttributes["href"];
                    }
                    break;
                }
            }
        }
    }

    // textNodeNumber is the index position of the first text node in the set of affected from the END of
    // the length of total nodes, not zero-based.
    // Example: ["This", "is", "a", "set", "of", "text", "nodes"]
    //      To edit "of text", values would be: textNodeNumber = 3 and textNodeCount = 2
    // This is because you can add a set of nodes to the same elementId,
    // which changes the total number of nodes

    function addTag(elementId, textNodeNumber, textNodeCount, tagName, tagAttributes) {

        // are we replacing an anchor tag's href only?
        if (tagName == "a") {
            var element = domJSON[elementId];
            var nodes = element[element.length - 1]["nodes"];

            for (var i = -1; i++ < nodes.length - 1;) {
                if ( nodes[i].substr(0, 2) == "a:" ) {
                    nodes[i] = "a:" + tagAttributes["href"];
                    element[i]["attrs"]["href"] = tagAttributes["href"];

                    return 0; // no nodes added
                    break;
                }
            }
        }

        var tagAction = function(elementId) {
            addJSONTag(elementId, tagName, tagAttributes);
        }

        return splitNodeSet(elementId, textNodeNumber, textNodeCount, tagAction);
    }

    function removeTag(elementId, textNodeNumber, textNodeCount, tagName) {
        var tagAction = function(elementId) {
            removeJSONTag(elementId, tagName);
        }

        return splitNodeSet(elementId, textNodeNumber, textNodeCount, tagAction);
    }

    function splitNodeSet(elementId, textNodeNumber, textNodeCount, tagAction) {

        var nodesChanged;
        var element = domJSON[elementId];
        var textNodes = element[element.length - 2]["text"].split(" ");

        // don't include a beginning/ending single spaces as a text nodes
        if (textNodes[0].length == 0) textNodes.shift();
        if (textNodes[textNodes.length - 1].length == 0) textNodes.pop();

        // flip index position from end to index position from start of nodes
        textNodeNumber = textNodes.length - textNodeNumber;

        if (textNodes.length != textNodeCount) {
            if (textNodeCount > textNodes.length) {
                // out of bounds, assume all remaining nodes
                textNodeCount = textNodes.length - textNodeNumber;
            }

            // split up text nodes/words
            var frontText = textNodes.slice(0, textNodeNumber);
            var middleText = textNodes.slice(textNodeNumber, textNodeNumber + textNodeCount);
            var backText = textNodes.slice(textNodeNumber + textNodeCount);
            
            element[element.length - 2]["text"] = frontText.join(" ") + " ";

            var elementCopy;
            if (backText.length) {
                elementCopy = $.extend(true, [], element);
                elementCopy[elementCopy.length - 2]["text"] = backText.join(" ") + " ";

                // remove any possible force-close, block tags when splitting
                var nodes = elementCopy[elementCopy.length -1]["nodes"];
                for (var i = -1; i++ < nodes.length - 1;) {
                    if ($.inArray(nodes[i], blockTags) != -1) {
                        delete elementCopy[i]["close"];
                    }
                }

                domJSON.splice(elementId + 1, 0, elementCopy);

                nodesChanged = 2;
            } else {
                nodesChanged = 1;
            }

            elementCopy = $.extend(true, [], element);
            elementCopy[elementCopy.length - 2]["text"] = middleText.join(" ") + " ";

            // remove any possible force-close, block tags when splitting
            var nodes = elementCopy[elementCopy.length -1]["nodes"];
            for (var i = -1; i++ < nodes.length - 1;) {
                if ($.inArray(nodes[i], blockTags) != -1) {
                    delete elementCopy[i]["close"];
                }
            }

            domJSON.splice(elementId + 1, 0, elementCopy);

            tagAction(elementId + 1);

        } else {
            // changing all text nodes in this element
            // add/remove the tag on the existing element
            tagAction(elementId);
            nodesChanged = 0;
        }

        return nodesChanged;
    }


    function addJSONTag(elementId, tagName, attributes) {
        noChanges = false;

        var htmlNode = {
            "tag": tagName
        }
        if (attributes) {
            htmlNode["attrs"] = attributes;
        }

        var element = domJSON[elementId];
        element.unshift(htmlNode);

        if (tagName == "a") {
            tagName = "a:" + htmlNode["attrs"]["href"];
        }
        element[element.length - 1]["nodes"].unshift(tagName);
    }

    function removeJSONTag(elementId, tagName) {
        noChanges = false;

        var element = domJSON[elementId];
        var nodes = element[element.length - 1]["nodes"];
        var tagLength = tagName.length;
        var found = -1;

        for (var i = -1; i++ < nodes.length -1;) {
            if (nodes[i].substr(0, tagLength) == tagName ) {
                found = i;
                break;
            }
        }

        if (found != -1) {
            nodes.splice(found, 1);

            element.splice(found, 1);
        }

    }

    function printTag(tag) {
        if (tag.substr(0, 2) == "a:") {
            var href = currentElement[anchorIdx]['attrs']['href'];
            if (href.substring(0, 11) == "javascript:") {
                console.warn("Javascript removed from link target.");
                href = "#";
            }
            html += '<a href="' + href + '">';
        } else {
            if ($.inArray(tag, validTags) != -1)
                html += "<" + tag + ">";
        }
    }

    function commonTraversal(elements, elementId) {

        // Loop around all of the following nodes
        // and find the "most shared tags" to "least shared tags"

        var uniqueTags = elements.slice();
        var commonTags = {};
        for (var x = elementId; x++ < domJSON.length - 1;) {

            var inspectElement = domJSON[x];
            var inspectNodes = inspectElement[inspectElement.length - 1];
            var inspectTags = inspectNodes["nodes"];

            jQuery.grep(elements, function(el) {
                if ($.inArray(el, inspectTags) != -1) {
                    if (!commonTags[el]) {
                        commonTags[el] = 1;
                    } else {
                        commonTags[el]++;
                    }

                    // remove tags that follow this element that aren't unique
                    var spliceIdx = $.inArray(el, uniqueTags);
                    if (spliceIdx != -1) {
                        uniqueTags.splice(spliceIdx, 1);
                    }
                }
            });
        }

        // * * * * * * * * * * * * *
        // * SORT COMMON TAGS BY MOST TO LEAST SHARED
        // * * * * * * * * * * * * *

        var tuples = [];
        for (var key in commonTags) tuples.push([key, commonTags[key]]);
        tuples.sort(function(a, b) {
            b = a[1];
            a = b[1];
            return a < b ? -1 : (a > b ? 1 : 0);
        });

        for (var x = -1; x++ < tuples.length - 1;) {
            printTag(tuples[x][0]);
        }

        // now write out tags in "difference" that weren't outputted by the tuples above...
        for (var x = -1; x++ < uniqueTags.length - 1;) {
            printTag(uniqueTags[x]);
        }
    }

    function writeHTML() {

        if (html.length && noChanges) {
            return html;
        } else {
            html = "";
        }

        var openTags = [];
        var prevTags = [];
        var difference;

        for (var i = -1; i++ < domJSON.length - 1;) {
            currentElement = domJSON[i];
            var currTags = currentElement[currentElement.length - 1]["nodes"].slice();

            // * * * * * * * * * * * * *
            // * CLOSE TAGS
            // * * * * * * * * * * * * *

            difference = [];
            jQuery.grep(prevTags, function(el) {
                if ($.inArray(el, currTags) == -1) difference.push(el);
            });

            // close block tags : add to difference if block tag in previous and in current both have "close"
            for (var x = -1; x++ < blockTags.length - 1;) {
                var tagIdx = $.inArray(blockTags[x], currTags);
                if (tagIdx != -1) {
                    if (domJSON[i][tagIdx]["close"])
                        difference.push(blockTags[x]);
                }
            }

            if (difference.length) {
                var openTagsLength = openTags.length;
                for (var x = openTagsLength; x-- > 0;) {
                    if ($.inArray(openTags[x], difference) != -1) {

                        if (openTags[x].substr(0, 2) == "a:") {
                            html += "</a>";
                        } else {
                            if ($.inArray(openTags[x], validTags) != -1)
                                html += "</" + openTags[x] + ">";
                        }

                        openTags.splice(x, 1);
                    }
                }
            }

            // * * * * * * * * * * * * *
            // * OPEN TAGS
            // * * * * * * * * * * * * *

            if (i == 0) {
                openTags = currTags;
                for (var n = -1; n++ < openTags.length - 1;) {
                    if (openTags[n].substr(0, 2) == "a:") {
                        anchorIdx = n;
                    }
                }
                commonTraversal(openTags, 1);

                // lastly, write out the text node associated with all of these tags
                html += currentElement[currentElement.length - 2]["text"];

            } else {
                difference = [];
                jQuery.grep(currTags, function(el, idx) {
                    if ($.inArray(el, openTags) == -1) {
                        difference.push(el);
                    }

                    if (el.substr(0, 2) == "a:") {
                        anchorIdx = idx;
                    }
                });

                commonTraversal(difference, i);

                // lastly, write out the text node associated with all of these tags
                html += currentElement[currentElement.length - 2]["text"];

                openTags = $.merge(openTags, difference);
            }

            prevTags = currTags;
        }

        // * * * * * * * * * * * * *
        // * CLOSE REMAINING OPEN TAGS
        // * * * * * * * * * * * * *

        for (var x = openTags.length; x-- > 0;) {
            if (openTags[x].substr(0, 2) == "a:") {
                html += "</a>";
            } else {
                if ($.inArray(openTags[x], validTags) != -1)
                    html += "</" + openTags[x] + ">";
            }
        }

        noChanges = true;

        return html;
    }

    function setDomJSON(json) {
        domJSON = JSON.parse(json);
    }


    return {
        parseHTML: parseHTML,
        writeHTML: writeHTML,
        addTag: addTag,
        removeTag: removeTag,
        updateAttributes: updateAttributes,
        setDomJSON: setDomJSON
    };

})();