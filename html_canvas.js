/*
HTML Canvas
Copyright (C) 2009 James S Urquhart
Refer to LICENSE file for license.
*/

(function(){
	String.prototype.trim = function() { return this.replace(/^\s+|\s+$/, ''); };
	
	// document node prototype
	function docNode(etype) {
		this.etype = etype;
		this.tagName = '';
		this.content = '';
		this.index = 0;
		this.attrs = {};
		this.parentIndex = 0;
		
		// render temp
		this.blockX = 0;      // render origin
		this.blockY = 0;
		this.renderX = 0;     // render position
		this.renderY = 0;
		this.renderWidth = 0; // rendered size (propagates backwards)
		this.renderHeight = 0;
	}
	
	// Finds main body tag in document
	function findBody(nodeList) {
		var len = nodeList.length;
		
		for (var i=0; i<len; i++) {
			var obj = nodeList[i];
			
			if (obj.etype == 2)
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
			
			debugLog("[" + i + "]" + obj.tagName + "=" + obj.content + ' @ P[' + obj.parentIndex + '] START=' + (curNode.blockX+curNode.renderWidth));
			
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
			if (obj.etype == 3) {
				if (curNode.tagName == 'B')
					ctx.font = "bold 12pt Arial";
				else
					ctx.font = "12pt Arial";
					
				var renderMetrics = ctx.measureText(obj.content);
				
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
	function render(nodeList) {
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
		
		var body = findBody(nodeList);
		if (!body)
			return;
		
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
			if (obj.etype == 3) {
				// TODO: style lookup
				if (curNode.tagName == 'B')
					ctx.font = "bold 12pt Arial";
				else
					ctx.font = "12pt Arial";
				
				// Render current style
				ctx.fillText(obj.content, obj.renderX, obj.renderY);
				debugLog(obj.content + " at " + obj.renderX + "," + obj.renderY);
			} else {
				if (obj.parentIndex > curNode.index) // sanity check
					continue;
				
				// New node
				nodeStack.push(obj);
				curNode = obj;
			}
		}
	}
	
	// Functions to make basic content nodes
	
	function addContentNode(list, content, parent)
	{
		var anon = new docNode(3);
		if (parent.tagName == 'SPAN')
			anon.content = content;
		else
			anon.content = content.trim();
		
		anon.index = list.length;
		anon.parentIndex = parent.index;
		list.push(anon);
		return anon;
	}
	
	
	function addRootNode(list, content, parent)
	{
		var anon = new docNode(0);
		anon.content = content;
		anon.index = list.length;
		anon.parentIndex = -1;
		list.push(anon);
		return anon;
	}


	function addBodyNode(list, content, parent)
	{
		var anon = new docNode(2);
		anon.content = content.trim();
		anon.index = list.length;
		anon.parentIndex = parent.index;
		list.push(anon);
		return anon;
	}
	
	function addDummyNode(list, content, parent)
	{
		var anon = new docNode(1);
		anon.etype = 1;
		anon.content = content.trim();
		anon.index = list.length;
		anon.parentIndex = parent.index;
		list.push(anon);
		return anon;
	}
	
	var makeTagFuncs = {
		'HTML': addRootNode,
		'BODY': addBodyNode,
		'P': addDummyNode,
		'B': addDummyNode,
		'SPAN': addDummyNode,
	};
	
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
		
		var startIDX = 0;
		var curStr = doc;
		var nodeStack = [];
		var nodeList = [];
		var len = doc.length;
		var topNode = null;
		
		// Search for tags...
		while (startIDX != -1 && startIDX < len) {
			var searchStr = doc.substr(startIDX); 
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
					addContentNode(nodeList, content, topNode);
				}
				
				// Open or close nodes
				if (!isClosing) {
					// Add node
					var tagFunc = makeTagFuncs[tagName];
					if (tagFunc)
						topNode = tagFunc(nodeList, tagName, topNode);
					else
						topNode = addDummyNode(nodeList, tagName, topNode)
					topNode.tagName = tagName;
					
					// Parse attributes
					var rg = new RegExp("([A-Za-z0-9_-]*)=((?:\"[^\"]*)|(?:'[^']*))", "g");
					var scans = searchStr.substr(1, searchStr.indexOf('>')-1);
					var attrs = null;
					
					while ((attrs = rg.exec(scans)) != null) {
						topNode.attrs[attrs[1]] = attrs[2].substr(1);
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
		
		debugLog("Generated Nodes:");
		debugLog(nodeList);
		
		return nodeList;
	}
	
	// Parse and load a sample document
	var doc = "<html><head><title></title></head><body><p class=\"woo\" id=\"render\" style=\"display:none;\">Rendering <b>HTML</b>...</p><p><span>In <b>Canvas</b></span>!</p><p>0_0</p></body></html>";
	var parsedDoc = parse(doc);
	render(parsedDoc);
}());