/*
HTML Canvas
Copyright (C) 2009 James S Urquhart
Refer to LICENSE file for license.
*/

(function(){
	String.prototype.trim = function() { return this.replace(/^\s+|\s+$/, ''); };
	
	// document node prototype
	function docNode(etype, document) {
		this.ownerDocument = document;
		this.nodeType = etype;
		this.tagName = '';
		this.nodeValue = '';
		this.index = 0;
		this.attributes = {};
		this.parentIndex = 0;
		
		// DOM attributes
		this.parentNode = null;
		this.childNodes = null;
		this.firstChild = null;
		this.lastChild = null;
		this.nextSibling = null;
		this.previousSibling = null;
		
		// render temp
		this.blockX = 0;      // render origin
		this.blockY = 0;
		this.renderX = 0;     // render position
		this.renderY = 0;
		this.renderWidth = 0; // rendered size (propagates backwards)
		this.renderHeight = 0;
	}

	function docHTML()
	{
		this.nodes = [];
		this.body = null;
		this.title = null;
	}
	
	// Iterator for nodes
	// Returns node in which func returns false, or null
	docNode.prototype.iterateNodes = function(func) {
		var nodeList = this.ownerDocument.nodes;
		var len = nodeList.length;
		var curStack = this.index;
		
		for (var i=this.index+1; i<len; i++) {
			var node = nodeList[i];
			
			if (node.parentIndex < curStack)
				break;
			if (!func.call(null, node)) {
				return node;
			}
		}
		
		return null;
	}
	
	docNode.prototype.getFirstElementByTagName = function(tag) {
		var selectAll = tag == '*';
		
		return this.iterateNodes(function(node){
			return !(selectAll || node.tagName == tag);
		});
	}
	
	// Helpful element functions
	
	docNode.prototype.getElementsByTagName = function(tag) {
		var selectAll = tag == '*';
		var list = [];
		this.iterateNodes(function(node){
			if (selectAll || node.tagName == tag)
				list.push(node);
			return true;
		});
		return list;
	}

	docNode.prototype.getElementsByName = function(name) {
		var list = [];
		this.iterateNodes(function(node){
			if (selectAll || node.attr.name == name)
				list.push(node);
			return true;
		});
		return list;
	}
	
	docNode.prototype.getElementById = function(id) {
		return this.iterateNodes(function(node){
			return node.attributes.id != id;
		});
	}
	
	docNode.prototype.getAttribute = function(name) {
		return this.attributes(name);
	}

	docNode.prototype.setAttribute = function(name, value) {
		this.attributes[name] = value;
	}
	
	// Finds main body tag in document
	function findBody(nodeList) {
		var len = nodeList.length;
		
		for (var i=0; i<len; i++) {
			var obj = nodeList[i];
			
			if (obj.nodeType == 9)
				return obj;
		}
		
		return 0;
	}
	
	// Finds an indexed node in list
	function findNodeID(list, id) {
		var len = list.length;
		for (var i=len-1; i > -1; i--) {
			if (list[i].index == id)
				return i;
		}
		
		return -1;
	}
	
	// Pops node stack down to idx
	function popToNodeStack(nodeStack, idx) {
		var closedNodeIDX = findNodeID(nodeStack, idx);
		if (closedNodeIDX >= 0) {
			return nodeStack.slice(0, closedNodeIDX+1);
		}
			
		return nodeStack;
	}
	
	// Finds last open tagName in list
	function findOpenNode(list, tagName) {
		var len = list.length;
		for (var i=len-1; i > -1; i--) {
			//debugLog(list[i].tagName + '==' + tagName);
			if (list[i].tagName == tagName)
				return i;
		}
		
		return -1;
	}
	
	// Lays out elements on page
	function layout(body, nodeList) {
		var len = nodeList.length;
		
		var nodeStack = [];
		var ctx = document.getElementById('output').getContext("2d");
		
		// initial style
		ctx.font = "12pt Arial";
		ctx.textAlign = "left";
		ctx.textBaseline = "top";
		ctx.fillStyle = "rgb(0, 0, 0, 1.0)";
		ctx.strokeStyle = "rgb(1, 0, 0, 1.0)";
		
		var curNode = body;
		nodeStack.push(body);
		
		for (var i=body.index+1; i<len; i++) {
			var obj = nodeList[i];
			
			debugLog("[" + i + "]" + obj.tagName + "=" + obj.nodeValue + ' @ P[' + obj.parentIndex + '] START=' + (curNode.blockX+curNode.renderWidth));
			
			// End of body?
			if (obj.parentIndex < body.index) {
				break;
			}
			
			// NOTE: ideally should figure out a better way of styling!
			var doBreak = false;
			
			// Update stack (in case [tag][content][tag]...)
			if (obj.parentIndex < curNode.index) {
				var closedNodeIDX = findNodeID(nodeStack, obj.parentIndex);
				
				//debugLog('POP STACK');
				
				// Increment width on all nodes up to closing index
				for (var j=nodeStack.length-2; j >= closedNodeIDX; j--) {
					// TODO: obviously better handling
					var node = nodeStack[j+1];
					var parentNode = nodeStack[j];
					
					if (parentNode.blockX + parentNode.renderWidth < node.blockX + node.renderWidth)
						parentNode.renderWidth = node.blockX + node.renderWidth - parentNode.blockX;
					
					if (parentNode.blockY + parentNode.renderHeight < node.blockY + node.renderHeight)
						parentNode.renderHeight = node.blockY + node.renderHeight - parentNode.blockY;
					
					parentNode.renderX = node.blockX + node.renderWidth;
					debugLog("  [" + nodeStack[j].index + "] += " + nodeStack[j+1].index);
				}
				
				// Test break on P
				// TODO: style lookup
				if (nodeStack[closedNodeIDX+1].tagName == 'P') {
					doBreak = true;
				}
				nodeStack = popToNodeStack(nodeStack, obj.parentIndex);
				curNode = nodeStack[nodeStack.length-1];
			}
			
			// Content node?
			if (obj.nodeType == 3) {
				if (curNode.tagName == 'B')
					ctx.font = "bold 12pt Arial";
				else
					ctx.font = "12pt Arial";
					
				var renderMetrics = ctx.measureText(obj.nodeValue);
				
				//debugLog("ADD ONTO " + curNode.tagName + "," + curNode.index);
				
				debugLog('    R AT ' + curNode.renderX + '[' + curNode.index + ']');
				// Plot position in current node render pos
				obj.renderX = curNode.renderX;
				obj.renderY = curNode.renderY;
				obj.renderWidth = renderMetrics.width;
				
				// Increment current node render pos
				curNode.renderX += obj.renderWidth;
				var delta = curNode.renderX - (curNode.blockX + curNode.renderWidth);
				if (delta > 0)
					curNode.renderWidth += delta;
				
				curNode.renderHeight = 14;
			} else {
				// Sanity check
				if (obj.parentIndex > curNode.index) {
					debugLog("!!Parse oddity");
					continue;
				}
				
				// Add new node on stack
				nodeStack.push(obj);
				
				// Set block origin
				if (doBreak) {
					obj.blockX = curNode.blockX;
					obj.blockY = curNode.renderY + curNode.renderHeight;
				} else {
					obj.blockX = curNode.renderX;
					obj.blockY = curNode.renderY;
				}
				
				// Set block render pos
				obj.renderX = obj.blockX;
				obj.renderY = obj.blockY;
					
				curNode = obj;
			}
		}
		
		debugLog("LAYOUT:");
		debugLog(nodeList);
		
		return nodeList;
	}
	
	function debugLog(line) {
		if (window.console)
			console.log(line);
	}
	
	// Renders parsed document
	function render(doc) {
		var nodeList = doc.nodes;
		var len = nodeList.length;
		var curX = 0;
		var curY = 0;
		
		var styleStack = [];
		var nodeStack = [];
		var ctx = document.getElementById('output').getContext("2d");
		
		ctx.font = "12pt Arial";
		ctx.textAlign = "left";
		ctx.textBaseline = "top";
		ctx.fillStyle = "rgb(0, 0, 0, 1.0)";
		
		var body = doc.body;
		
		// pre-process layout
		nodeList = layout(body, nodeList);
		
		// Iterate nodes
		var curNode = body;
		for (var i=body.index+1; i<len; i++) {
			var obj = nodeList[i];
			
			// End of body?
			if (obj.parentIndex < body.index)
				break;
			
			// DEBUG
			//if (obj.tagName == 'P')
			//	ctx.strokeRect(obj.blockX, obj.blockY, obj.renderWidth, 12);
				
			// Update stack (in case [tag][content][tag]...)
			if (obj.parentIndex < curNode.index) {
				nodeStack = popToNodeStack(nodeStack, obj.parentIndex);
				curNode = nodeStack[nodeStack.length-1];
			}
			
			// Content node?
			if (obj.nodeType == 3) {
				// TODO: style lookup
				if (curNode.tagName == 'B')
					ctx.font = "bold 12pt Arial";
				else
					ctx.font = "12pt Arial";
				
				// Render current style
				ctx.fillText(obj.nodeValue, obj.renderX, obj.renderY);
				debugLog(obj.nodeValue + " at " + obj.renderX + "," + obj.renderY);
			} else {
				if (obj.parentIndex > curNode.index) // sanity check
					continue;
				
				// New node
				nodeStack.push(obj);
				curNode = obj;
			}
		}
	}
	
	// Populates DOM attributes
	/*
	parentNode
	The parent of this node.
	childNodes
	A NodeList that contains all children of this node.
	firstChild
	The first child of this node.
	lastChild
	The last child of this node.
	previousSibling
	The node immediately preceding this node.
	nextSibling
	The node immediately following this node.
	attributes
	A NamedNodeMap containing the attributes of this node (if it is an Element) or null otherwise.
	ownerDocument
	*/
	function populateDOM(root)
	{
		var nodeStack = [];
		var curNode = root;
		var lastNode = null;
		
		/*
		BODY[ch=[P,P], fc=P, lc=P]
		  P [pn=BODY, cn=P, ln=P, ch=[B,TX,B], fc=B, lc=B, ns=P]
		    B [pn=P, cn=B, ns=TX]
		    TX [cn=TX, ps=B, pn=P, ns=B]
		    B [cn=B, ps=TX, pn=P]
		  P [cn=P, ps=P, pn=BODY]
		*/
		root.iterateNodes(function(node){
			
			// Reset children
			node.childNodes = null;
			node.firstChild = null;
			node.lastChild = null;
			node.previousSibling = null;
			node.nextSibling = null;
			
			if (node.parentIndex < curNode.index) {
				// Closed nodes
				nodeStack = popToNodeStack(nodeStack, node.parentIndex);
				curNode = nodeStack[nodeStack.length-1];
			}
			
			// Set children of parents
			if (curNode.childNodes == null) {
				curNode.childNodes = [node];
				curNode.firstChild = node;
			} else {
				curNode.childNodes.push(node);
			}
			
			// Set siblings
			if (curNode.lastChild) {
				curNode.lastChild.nextSibling = node;
				node.previousSibling = curNode.lastChild;
			}
			curNode.lastChild = node;
			node.parentNode = curNode;
			
			// Update stack
			if (node.parentIndex >= curNode.index) {
				// Open nodes
				nodeStack.push(node);
				curNode = node;
			}
			
			lastNode = node;
			return true;
		});
	}
	
	// Functions to make basic content nodes
	
	function addContentNode(document, content, parent)
	{
		var anon = new docNode(3, document);
		if (parent.tagName == 'SPAN')
			anon.nodeValue = content;
		else
			anon.nodeValue = content.trim();
		
		anon.index = document.nodes.length;
		anon.parentIndex = parent.index;
		document.nodes.push(anon);
		return anon;
	}
	
	
	function addRootNode(document, content, parent)
	{
		var anon = new docNode(1, document);
		anon.nodeValue = content;
		anon.index = document.nodes.length;
		anon.parentIndex = -1;
		document.nodes.push(anon);
		return anon;
	}

	function addDocAttrNode(document, content, parent)
	{
		var anon = new docNode(2, document);
		anon.nodeValue = content.trim();
		anon.index = document.nodes.length;
		anon.parentIndex = parent.index;
		document.nodes.push(anon);
		return anon;
	}

	function addBodyNode(document, content, parent)
	{
		var anon = new docNode(9, document);
		anon.nodeValue = content.trim();
		anon.index = document.nodes.length;
		anon.parentIndex = parent.index;
		document.nodes.push(anon);
		return anon;
	}
	
	function addDummyNode(document, content, parent)
	{
		var anon = new docNode(1, document);
		anon.nodeType = 0;
		anon.nodeValue = content.trim();
		anon.index = document.nodes.length;
		anon.parentIndex = parent.index;
		document.nodes.push(anon);
		return anon;
	}
	
	var makeTagFuncs = {
		'HTML': addRootNode,
		'TITLE': addDocAttrNode,
		'BODY': addBodyNode,
		'P': addDummyNode,
		'B': addDummyNode,
		'SPAN': addDummyNode,
	};
	
	var HTMLCommentStrip = new RegExp("<![^>]*>"); // a bit simple, but works for now
	
	// Parses document
	//
	// e.g. "<html><head><title></title></head><body><p class="top">FOO <b>woo</b></p><p>Foo 2</p></body></html>"
	//
	// [["html", "", 0, -1], 
	//  ["head", "", 1, 0], 
	//  ["title", "", 2, 1],
	//  ["body", "", 3, 0],
	//  ["p", "FOO ", 4, 3],
	//  ["b", "woo", 5, 4],
	//  ["p", "Foo 2", 6, 3],
	// ]
	//
	function parse(doc) {
		var tagParse = new RegExp("</?([A-Za-z]*)( ([a-zA-Z0-9_-]*=(\".*\")|('.*') ?)*)?>", "");
		
		var rawDoc = doc.replace(HTMLCommentStrip, "");
		var startIDX = 0;
		var curStr = doc;
		var nodeStack = [];
		var genDoc = new docHTML();
		var len = rawDoc.length;
		var topNode = null;
		
		// Search for tags...
		while (startIDX != -1 && startIDX < len) {
			var searchStr = rawDoc.substr(startIDX);
			var nextTag = searchStr.search(tagParse);
			
			//debugLog("SS:" + searchStr);
			
			if (nextTag != -1) {
				// Found tag, start wih content + name
				var content = searchStr.substr(0, nextTag); // existing node content
				searchStr = searchStr.substr(nextTag);
				var tagName = searchStr.match("</?([A-Za-z]*)")[1].toUpperCase();
				var isClosing = searchStr.indexOf('/') == 1;
				
				//debugLog("Found tag " + tagName);
				//debugLog("CONTENT:" + content);
				//debugLog("CLOSING:" + isClosing);
				
				// Advance next search pos
				startIDX += nextTag + searchStr.indexOf('>') + 1;
				
				// Insert content node
				if (topNode != 0 && content.length > 0) {
					addContentNode(genDoc, content, topNode);
				}
				
				// Open or close nodes
				if (!isClosing) {
					// Add node
					var tagFunc = makeTagFuncs[tagName];
					if (tagFunc)
						topNode = tagFunc(genDoc, tagName, topNode);
					else
						topNode = addDummyNode(genDoc, tagName, topNode)
					topNode.tagName = tagName;
					
					// Parse attributes
					var rg = new RegExp("([A-Za-z0-9_-]*)=((?:\"[^\"]*)|(?:'[^']*))", "g");
					var scans = searchStr.substr(1, searchStr.indexOf('>')-1);
					var attrs = null;
					
					while ((attrs = rg.exec(scans)) != null) {
						topNode.attributes[attrs[1]] = attrs[2].substr(1);
					}
					
					nodeStack.push(topNode);
				} else {
					// Close matching node
					var closedNodeIDX = findOpenNode(nodeStack, tagName);
					//debugLog("CLOSED IDX==" + closedNodeIDX);
					//debugLog(nodeStack);
					if (closedNodeIDX >= 0) {
						nodeStack = nodeStack.slice(0, closedNodeIDX);
					}
					
					if (nodeStack.length > 0)
						topNode = nodeStack[nodeStack.length-1];
					else
						topNode = null;
					
					continue;
				}
			} else // no more tags
				break;
		}

		debugLog("Generated Doc:");
		debugLog(genDoc);
		
		// Find useful data
		genDoc.body = findBody(genDoc.nodes);
		genDoc.head = genDoc.nodes[0].getFirstElementByTagName('HEAD');
		if (genDoc.head) {
			var title = genDoc.nodes[0].getFirstElementByTagName('TITLE');
			if (title) {
				title = title.getFirstElementByTagName('*');
				if (title)
					genDoc.title = title.nodeValue;
			}
		}
		
		return genDoc;
	}
	
	// CSS Parser
	var CSSCommentStrip = new RegExp("/\\*[^\\*]*\\*/");
	function stripCSSComments(str) {
		return str.replace(CSSCommentStrip, "");
	}
	
	function parseCSSSelectors(doc) {
		// chunker taken from sizzle, (C) Copyright 2009, The Dojo Foundation
		var chunker = /((?:\((?:\([^()]+\)|[^()]+)+\)|\[(?:\[[^[\]]*\]|['"][^'"]*['"]|[^[\]'"]+)+\]|\\.|[^ >+~,(\[\\]+)+|[>+~])(\s*,\s*)?/g;
		var selectorList = [];
		var elements = [];
		var nextElement;
		
		var lastElement = null;
		var matchParent = false;
		var matchSibling = false;
		
		while ((nextElement = chunker.exec(doc)) != null) {
			// TODO: hook into an existing CSS selector lib
			
			var rule = nextElement[1];
			elements.push(rule);
			
			if (nextElement[2] && nextElement[2].substr(0,1) == ',') {
				// Selector ended
				selectorList.push(elements);
				elements = [];
			}
		}
		
		// Final element?
		if (elements.length != 0)
			selectorList.push(elements);
		
		return selectorList;
	}

	function parseCSSProperties(doc) {
		var nameParse = new RegExp("([A-Za-z0-9\-_]+):", "g");
		var propParse = /((?:'[^']*')|(?:"[^"]*")|[^;}])*/;
		var propertyList = {};
		var nextName;
		
		while ((nextName = nameParse.exec(doc)) != null) {
			var name = nextName[1];
			var foundProp = propParse.exec(doc.substr(nameParse.lastIndex));
			
			propertyList[name] = foundProp[0]; // TODO: parse value -> values
			nextName.lastIndex = foundProp.index + foundProp[0].length + 1;
		}
		
		return propertyList;
	}
	
	function parseCSS(doc) {
		var rawDoc = stripCSSComments(doc);
		var blockParse = /(?:(@[a-zA-z]+)\s((?:[A-Za-z]+)|(?:'[^']*')|(?:"[^"]*")|(?:(?:[A-Za-z]*)\([^\)]*\)));)|({[^{]*})/g;
		
		var startIDX = 0;
		var len = rawDoc.length;
		
		// TODO: handle blocks better
		while (startIDX != -1 && startIDX < len) {
			var nextBlock = blockParse.exec(rawDoc);
			
			if (nextBlock != null) {
				if (nextBlock[1]) {
					// key [1]
					// value [2]
					// TODO
					console.log("RULE: " + nextBlock[1] + ',' + nextBlock[2]);
				} else if (nextBlock[3]) {
					// Normal selector block
					var selectors = parseCSSSelectors(rawDoc.substr(startIDX, nextBlock.index-startIDX));
					var blockStr = rawDoc.substr(nextBlock.index+1, blockParse.lastIndex-nextBlock.index-1);
					debugLog("BLOCK:"+blockStr);
				
					var properties = parseCSSProperties(blockStr);
					debugLog('++');
					debugLog(selectors);
					debugLog("--");
					debugLog(properties);
					debugLog('++');
				}
				
				startIDX = blockParse.lastIndex;
			} else
				break;
		}
	}
	
	// Parse and load a sample document
	var doc = "<html><head><title>Test</title></head><body><!-- Begin test --><p class=\"woo\" id=\"render\" style=\"display:none;\">Rendering <b>HTML</b>...</p><p><span>In <b>Canvas</b></span>!</p><p>0_0</p></body></html>";
	var parsedDoc = parse(doc);
	populateDOM(parsedDoc.nodes[0]);
	render(parsedDoc);
	
	debugLog("Node function test");
	debugLog(parsedDoc.nodes[0].getElementsByTagName('BODY'));
	debugLog(parsedDoc.nodes[0].getElementById('render'));
	debugLog(parsedDoc.nodes[0].getElementById('render').getElementsByTagName('*'));
	debugLog(parsedDoc.nodes[0].getElementsByTagName('*'));
	
	// Test parse CSS
	debugLog("Parse css test");
	parseCSS("@test testValue; div[foo=lol][goo=boo] > p { foo: 1; woo:\"goo\"; } .wii { text-align: center }");
}());