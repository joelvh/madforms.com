
$(function() {
	
	var win = $(window),
		idCounter = 0,
		editorSelector = ".madforms.editor",
		indicator = $('<div id="madforms-indicator" class="madctrl"><img src="icons/add.png" border="0" height="16" width="16" alt="Add"/></div>').appendTo(document.body),
		indicatorHeight = indicator.outerHeight(),
		indicatorWidth = indicator.outerWidth(),
		indicatorShowTimeout,
		indicatorHideTimeout,
		menu = $('<ul id="madforms-menu" class="madctrl"><li class="phone"><img src="icons/telephone.png" border="0" height="16" width="16" alt="Phone number"/> Phone number</li><li class="password"><img src="icons/textfield_key.png" border="0" height="16" width="16" alt="Password"/> Password</li><li class="email"><img src="icons/email.png" border="0" height="16" width="16" alt="Email address"/> Email address</li><li class="text"><img src="icons/textfield.png" border="0" height="16" width="16" alt="Text box"/> Text box</li><li class="list"><img src="icons/textfield_add.png" border="0" height="16" width="16" alt="Option list"/> Option list</li></ul>').appendTo(document.body),
		settings = $('<div id="madforms-settings" class="madctrl"><div class="text"><div><label for="madctrl-text-type">Type</label> <select id="madctrl-text-type" class="type"><option value="text">Text box</option><option value="email">Email address</option><option value="password">Password</option><option value="phone">Phone number</option></select></div>' + 
						'<div><label for="madctrl-text-label">Label</label> <input type="text" id="madctrl-text-label" class="label"/></div>' + 
						'<div><input type="checkbox" value="required" id="madctrl-text-required" class="required"/><label for="madctrl-text-required">Required</label> <a href="#" class="minus">-</a>/<a href="#" class="plus">+</a> Width <a href="#" class="delete"><img src="icons/cancel.png" border="0" height="16" width="16" alt="Delete text box"/> Delete</a></div></div>' + 
						'<div class="list"><div><label for="madctrl-list-default">Default</label> <input type="text" id="madctrl-list-default" class="default"/></div><div><label for="madctrl-list-options">Options</label> <textarea id="madctrl-list-options" class="options" rows="4"></textarea></div>' + 
						'<div><a href="#" class="delete"><img src="icons/cancel.png" border="0" height="16" width="16" alt="Delete text box"/> Delete</a></div></div></div>').appendTo(document.body),
		menuHideTimeout,
		editors = $(".madforms.editor"),
		context = {
			editor: null,
			range: null,
			field: null
		},
		data = {},
		//compatibility
		fakingPlaceholders = !('placeholder' in document.createElement('input'));
	
	//functions
	var subscribe = function(event) {
			var original = Array.prototype.slice.call(arguments);
			//loop through handlers to add wrapper handler that removes event from args when called
			for (var j=1; j < original.length; j++) {
				var handler = original[j];
				//wrapper handler
				original[j] = function(e) {
					var args = Array.prototype.slice.call(arguments);
					args.shift();
					handler.apply(this, args);
				};
			}
			win.bind.apply(win, original);
		},
		publish = function(event) {
			//console.log("publish", event)
			win.trigger.apply(win, arguments);
		},
		cleanupPaste = function(editor) {
		$("*", editor).each(function(i, item) {
			var current = $(item);
			if (!current.is("input,select,option")) {
				//move child nodes outside element and remove element
				current.before(current.contents());
				current.remove();
			}
			else {
				//decided to allow styles of any kind
				//current.removeAttr("style").removeAttr("class");
				//convert form fields to text
				//convertToText(item);
			}
		})
	},
	convertToText = function(item) {
		var text = "";
		//item.placeholder property is the "default" value
		switch (item.tagName) {
			case "SELECT":
				text = item.options[item.selectedIndex].text;
				break;
			case "INPUT":
				var type = item.type.toLowerCase();
				if (type == "text" || type == "password") {
					text = item.value || item.placeholder || "";
				}
				break;
			default:
				console.log("Convert to text???", item);
				break;
		}
		
		$(item).replaceWith(text);
	},
	convertToForm = function(target) {
	},
	getActiveEditorElement = function(target, stopFallbacks) {
		var checker = $(target);
		if (checker.length) {
			if (checker.is(editorSelector)) {
				return checker[0];
			}
			var parent = checker.parent(editorSelector);
			if (parent.length) {
				return parent[0];
			}
		}
		if (stopFallbacks) {
			return null;
		}
		//do some fallback detection with activeElement
		var fallback = arguments.callee(document.activeElement, true);
		
		if (fallback) {
			return fallback;
		}
		//do some fallback detection with current range
		var selection = document.getSelection();
		
		if (selection.rangeCount) {
			var range = selection.getRangeAt(0),
				startEditor = arguments.callee(range.startContainer, true),
				endEditor = arguments.callee(range.endContainer, true);
			
			if (startEditor === endEditor) {
				fallback = startEditor;
			}
		}
		
		return fallback;
	};
	//commands
	var activateEditor = function(editor) {
			if (context.editor == editor) {
				return;
			}
			if (context.editor) {
				deactivateEditor(context.editor);
			}
			context.editor = editor;

			publish("editorActivated", editor, "joel");
		},
		deactivateEditor = function(editor) {
			
			hideIndicator(editor);
			
			context.editor = null;
			context.range = null;
			
			publish("editorDeactivated", editor);
		},
		showIndicator = function(target) {
			context.field = null;
			var selection = window.getSelection();
			var range = (selection.rangeCount) ? selection.getRangeAt(0) : null;
			context.range = range;
			console.log(range)
			if (range != null && getActiveEditorElement(range.startContainer, true) === getActiveEditorElement(range.endContainer, true)) {
				var newNode = $('<span class="madctrl caret">&nbsp;</span>');
					var rangeCopy = range.cloneRange();
					rangeCopy.collapse(false);//collapse to end
					rangeCopy.insertNode(newNode[0]);
					rangeCopy.detach();
				var position = $(newNode).offset();
				indicator.css({top: position.top - indicatorHeight, left: position.left - (indicatorWidth / 2)});
				indicator.stop(true, true);
				indicator.fadeIn('fast');
				newNode.remove();
				selection.addRange(range);
			}
					
			publish("indicatorDisplayed");
		},
		hideIndicator = function(editor) {
			clearTimeout(indicatorShowTimeout);
			hideGui(settings);
			hideGui(menu);
			
			indicator.stop(true, true);
			indicator.hide();//.fadeOut('fast');
			
			publish("indicatorHidden", editor);
		},
		hideGui = function(gui) {
			gui.stop(true, true);
			gui.hide();//fadeOut('fast');
		},
		showGui = function(gui, field, buffer) {
			var jfield = $(field);
			var position = jfield.offset();
			//indicator.css({top: position.top - indicatorHeight, left: position.left + ($(field).outerWidth() / 2) - (indicatorWidth / 2)});
			//indicator.stop(true, true);
			//indicator.fadeIn('fast');
			
			var guiHeight = gui.outerHeight(),
				guiWidth = gui.outerWidth(),
				halfWidth = guiWidth / 2,
				//winHeight = win.height(),
				//winWidth = win.width(),
				doc = $(document),
				scrollTop = doc.scrollTop(),
				//scrollLeft = doc.scrollLeft(),
				scrollWidth = doc.width();
			
			buffer = buffer || 8;
			
			var top = position.top - guiHeight - buffer;
			gui.addClass("top");
			if (top < 0) {
				top = position.top + jfield.outerHeight() + buffer;//0;
				gui.removeClass("top");
				gui.addClass("bottom");
			}
			var left = position.left + (jfield.outerWidth() / 2) - halfWidth;
			if (left + guiWidth > scrollWidth) {
				left = scrollWidth - guiWidth;
			}
			if (left < 0) {
				left = 0;
			}
			
			gui.css({top: top, left: left}).fadeIn('fast');
			
			publish("menuDisplayed");
		},
		createTextBox = function() {
			
		},
		createDropDown = function() {
			
		},
		editTextBox = function(field, focus) {
			context.field = field;
			var jfield = $(field);
			settings.find("div").hide();
			var text = settings.find(".text");
			text.show();
			//show child divs incase they're hidden
			text.find("div").show();
			text.find(".label").val(field.title || field.placeholder);
			text.find('.required')[0].checked = jfield.hasClass("required");
			//highlight selected input type
			var type = text.find(".type");
			var option;
			type.find("option").each(function(i, item) {
				if (jfield.hasClass(item.value)) {
					option = item;
				}
			});
			type.val((option) ? option.value : field.type);
			
			showGui(settings, field);
			
			if (focus) {
				text.find(".label").focus();
			}
			
			publish("settingsDisplayed", field);
		},
		editDropDown = function(field, focus) {
			console.log('editDropDown', field)
			context.field = field;
			
			settings.find("div").hide();
			var list = settings.find(".list");
			list.show();
			list.find("div").show();
			
			var defaultText = field.options[field.selectedIndex].text;
			list.find(".default").val(defaultText);
			//go through options and populate textarea
			var options = "";
			for (var i=0;i<field.options.length;i++) {
				//skip listing the "default" if it's first
				//if (i == 0 && field.options[i].text == defaultText) {
				//	continue;
				//}
				if (options) {
					options += "\n";
				}
				options += field.options[i].text;
			}
			list.find(".options").val(options);
			
			showGui(settings, field);
			
			//list.find(".default").focus();
			
			publish("settingsDisplayed", field);
		},
		getSettings = function(editorId) {
			var form = {
				fields: []
			};
			var nodes = $("#" + editorId).contents();
			var mergedText = "";
			var counter = 0;
			for (var i=0; i<nodes.length;i++) {
				var node = nodes[i];
				switch (node.nodeType) {
					case 1: //element
						if (mergedText) {
							form.fields.push(mergedText.replace(/\s{2,}/g, " "));
							mergedText = "";
						}
						switch (node.nodeName) {
							case "SELECT":
								var items = [];
								$("option", node).each(function(i, item) {
									items.push(item.text);
								});
								form.fields.push({
									name: "field" + (++counter),
									type: "list",
									label: node.options[node.selectedIndex].text,
									items: items
								});
								break;
							case "INPUT":
								 switch (node.type.toLowerCase()) {
								 	case "text":
									case "password":
										var jnode = $(node);
										form.fields.push({
											name: "field" + (++counter),
											type: (jnode.hasClass("email")) ? "email" : (jnode.hasClass("phone")) ? "phone" : node.type,
											label: node.placeholder || node.title,
											value: node.value,
											width: $(node).width(),
											required: jnode.hasClass("required")
										});
										break;
									//case "tel":
									//case "email":
								 }
								 break;
						}
						break;
					case 3: //text
						mergedText += node.nodeValue;
						break;
				}
			}
			//if the last nodes were text, we'll make sure to add them
			if (mergedText) {
				form.fields.push(mergedText.replace(/\s{2,}/g, " "));
				mergedText = "";
			}
			return form;
		};
	//pub/sub events
	subscribe("editorActivated", function(editor) {
		$(editor).addClass("active");

		if (!editor.id) {
			editor.id = "madforms_editor_" + (++idCounter);
		}
		if (!data[editor.id]) {
			data[editor.id] = {};
		}
	});
	subscribe("editorDeactivated", function(editor) {
		$(editor).removeClass("active");
	});
	subscribe("indicatorDisplayed", function() {
	});
	subscribe("indicatorHidden", function(editor) {
		
	});
	subscribe("menuDisplayed", function() {
		
	});
	subscribe("settingsDisplayed", function(field) {
		
	})
	//bind events
	win.resize(function(e) {
		hideIndicator(context.editor);
	});
	settings.bind('click', function(e) {
		if (context.field) {
			context.field.blur();
		}
	});
	$(".text .label", settings).bind("change keyup", function(e) {
		context.field.title = this.value;
		context.field.placeholder = this.value;
		
		if (fakingPlaceholders && $(context.field).hasClass('placeholder')) {
			context.field.value = this.value;
		}
	});
	$(".text .type", settings).bind("change", function(e) {
		var field = $(context.field);
		var type = this.value;
		for (var i=0;i<this.options.length;i++) {
			field.removeClass(this.options[i].value);
		}
		if ((type == "text" || type == "password") && field[0].type != type) {
			//TODO: need to make sure that switching "type" attribute works in IE and other browsers
			//create placeholder
			var placeholder = $('<span style="display:none"/>');
			//add placeholder before input, remove input from dom, change property
			field.before(placeholder).remove().attr("type", type);
			//add input back, remove placeholder
			placeholder.after(field).remove();
		}
		else {
			field.addClass(type);
		}
	});
	$(".text .required", settings).bind("change", function(e) {
		var field = $(context.field).removeClass('required');
		if (this.checked) {
			field.addClass('required');
		}
	});
	$(".text .plus", settings).bind("mousedown", function(e) {
		e.preventDefault();
		var field = $(context.field);
		var top = field.offset().top;
		var width = Math.min(field.innerWidth() + 3, 500);
		field.css("width", width);

		if (field.offset().top != top) {
			settings.unbind('mouseout.afterResize').one('mouseout.afterResize', function(e) {
				showGui(settings, context.field);
			});
		};
	});
	$(".text .minus", settings).bind("mousedown", function(e) {
		e.preventDefault();
		var field = $(context.field);
		var top = field.offset().top;
		var width = Math.max(field.innerWidth() - 3, 10);
		field.css("width", width);
		
		if (field.offset().top != top) {
			settings.unbind('mouseout.afterResize').one('mouseout.afterResize', function(e) {
				showGui(settings, context.field);
			});
		};
	});
	settings.find(".delete").bind('click', function(e) {
		e.preventDefault();
		if (confirm("Are you sure you want to delete this field?")) {
			$(context.field).remove();
			hideIndicator(context.editor);
		}
	});
	var generateListItems = function(list, options, defaultText) {
		list.options.length = 0;
		var defaultOption = document.createElement('option');
		defaultOption.value = defaultOption.text = defaultText;
		defaultOption.selected = true;
		list.options.add(defaultOption);
		var defaultMoved = false;
		
		for (var i=0;i<options.length;i++) {
			var option = document.createElement('option');
			option.value = option.text = options[i];
			list.options.add(option);
			
			if (!defaultMoved && options[i] == defaultOption.text) {
				$(defaultOption).remove();
				option.selected = true;
				defaultMoved = true;
			}
		}
	};
	settings.find(".list .default").bind("keyup", function(e) {
		context.field.options[context.field.selectedIndex].text = this.value;
	}).bind("blur", function(e) {
		//blur instead of change event for firefox
		generateListItems(context.field, settings.find(".list .options").val().split("\n"), this.value);
	});
	settings.find(".list .options").bind("blur", function(e) {
		generateListItems(context.field, this.value.split("\n"), settings.find(".list .default").val());
	});
	$("select", editors).live("change", function(e) {
		var defaultText = this.options[this.selectedIndex].text;
		settings.find(".list .default").val(defaultText);
		editDropDown(this, true);
	});
	//get menu items that are not "list"
	$("li:not(.list)", menu).click(function(e) {
		var text = $.trim(context.range.toString());
		var defaultWidth = 110;
		var fallback = !context.range.toString();
		var field;
		var li = $(this);
		var type = (li.hasClass("password")) ? "password" : "text";
		if (!fallback) {
			try {
				var span = $('<div style="float:left;white-space:nowrap;text-align:left;"/>');
				context.range.surroundContents(span[0]);
				var spanWidth = span.width();
				field = $('<input/>').attr("type", type).attr("placeholder", text).attr("title", text);
				//context.range.extractContents();
				//make sure the field is at least 10px wide
				var width = Math.max(spanWidth, 10);
				//make sure the field is at most 500px wide
				width = Math.min(width, 500);
				field.css("width", width);
				//context.range.insertNode(field);
				span.replaceWith(field);
				var innerWidth = field.innerWidth();
				var buffer = innerWidth - field.width();
				//adjust for padding
				width = Math.min(innerWidth + (2 * buffer), 500);
				field.css('width', width);
			} catch (e) {
				fallback = true;
			}
		}
		if (fallback) {
			context.range.extractContents();
			field = $('<input/>').attr("type", type).css("width", defaultWidth).attr("placeholder", text).attr("title", text);
			context.range.insertNode(field[0]);
		}
		
		//add class names if not just text or password fields
		if (type == "text") {
			li.hasClass("email") && field.addClass("email");
			li.hasClass("phone") && field.addClass("phone");
		}
		
		fakePlaceholder(field);

		hideIndicator(context.editor);//getActiveEditorElement());
		editTextBox(field[0], true);
	});
	$(".list", menu).click(function(e) {
		var text = $.trim(context.range.toString());
		context.range.extractContents();
		var select = $('<select><option value=""></option></select>').attr("title", text);
		select.find("option").text(text);
		var field = select[0];
		context.range.insertNode(field);
		//firefox won't work if contentEditable isn't disabled on the select
		select[0].contentEditable = false;
		hideIndicator(context.editor);//getActiveEditorElement());
		editDropDown(field, true);
	});
	$("select", editors).live('focus', function(e) {
		var selection = document.getSelection();
		//var range = (selection.rangeCount) ? selection.getRangeAt(0) : document.createRange();
		selection && selection.collapse && selection.collapse();
		//range.selectNode(this);
		//selection.addRange(range);
		hideIndicator(context.editor);
		var field = this;
		indicatorShowTimeout = setTimeout(function() {
			clearTimeout(indicatorHideTimeout);
			editDropDown(field);
		}, 250);
	});
	$(document).bind('focus mouseup keyup', function(e) {
		//deactivate editor if clicking somewhere unrelated to the current editor
		var target = $(e.target);
		if (context.editor && !target.hasClass("madforms") && !target.hasClass("madctrl") && !target.closest(".madforms,.madctrl").length)
		{
			deactivateEditor(context.editor);
		}
	});
	editors.each(function(i, item) {
		item.contentEditable = true;
		var editor = $(item);
		if (!$.trim(editor.text())) {
			editor.html("<br>");
		}
	})
	.bind('paste', function(e) {
		//e.preventDefault();
		setTimeout(function() {
			cleanupPaste(getActiveEditorElement(e.target));
		}, 0);
	})
	.bind('focus', function(e) {
		activateEditor(this);
	})
	.bind('mousedown keydown', function(e) {
		if (context.editor != this) {
			this.focus();
		}
	})
	.bind('mousedown keydown', function(e) {
		//make sure that the settings menu is not hidden if the target is an input or related (e.g. OPTION element)
		if (!context.field || (context.field != e.target && !$.contains(context.field, e.target))) {
			hideIndicator(this);
		}
	})
	.bind('keydown', function(e) {
		//when tab is hit on an input, it cycles focus.  
		//to avoid last field tab cycling to input in settings menu, we hide on tab always.
		if (e.target.tagName == "INPUT" && e.keyCode == 9) {
			hideIndicator(context.editor);
		}
	})
	.bind('keyup', function(e) {
		if (e.target.tagName != "INPUT") {
			hideIndicator(context.editor);
		}
		indicatorShowTimeout = setTimeout(function() {
			clearTimeout(indicatorHideTimeout);
			if (e.target.tagName == "INPUT") {
				editTextBox(e.target);
			}
			else if (e.target.tagName == "SELECT") {
				editDropDown(e.target);
			}
			else {
				showIndicator(e.target);
			}
		}, (e.keyCode == 9) ? 10 : 750);//if tab is pressed, show quickly
	})
	.bind('mouseup', function(e) {
		//firefox may fire on an OPTION that positions the indicator in top left corner
		if (e.target.tagName == "OPTION") {
			return;
		}
		//keep from flickering already-displayed settings menu
		if (e.target != context.field) {
			hideIndicator(context.editor);
		}
		indicatorShowTimeout = setTimeout(function() {
			clearTimeout(indicatorHideTimeout);
			if (e.target.tagName == "INPUT") {
				editTextBox(e.target);
			}
			else if (e.target.tagName == "SELECT") {
				editDropDown(e.target);
			}
			else {
				showIndicator(e.target);
			}
		}, (e.target.tagName == "INPUT" || e.target.tagName == "SELECT") ? 10 : 250); //if over form field, show quickly
	});
	indicator.bind('mouseover click', function(e) {
		clearTimeout(menuHideTimeout);
		if (!context.field) {
			showGui(menu, indicator, 0 - (indicator.outerHeight() / 2));
		}
	})
	.bind('mouseout', function() {
			if (!context.field) {
				clearTimeout(menuHideTimeout);
				menuHideTimeout = setTimeout(function() {
					hideGui(menu);
				}, 500);
			}
		});
	/*
	editors.find("input[type=text],input[type=password],input[type=email],input[type=tel]").live("dblclick", function(e) {
		var selection = document.getSelection();
		selection && selection.collapse && selection.collapse();
		this.select();
	});
	*/
	menu.bind('mouseout', function() {
			clearTimeout(menuHideTimeout);
			menuHideTimeout = setTimeout(function() {
				hideGui(menu);
			}, 500);
		})
	.bind('mouseover', function(e) {
		clearTimeout(menuHideTimeout);
	});
	
	//validation
	$(".madforms input.email").live('blur', function(e) {
		//blur instead of change event for firefox
		var field = $(this),
			value = this.value,
			emailRegex = /^\w+([~\+_\-\.]\w*)*@[a-z0-9]+(\.?[a-z0-9\-]+)*(\.[a-z]{2,})+$/i;
			
		if ($.trim(value) && !emailRegex.test(value)) {
			alert("The email address you specified is not valid.");
			e.preventDefault();
		}
	});
	$("form.madforms").live('submit', function(e) {
		$("input,select", this).each(function(i, item) {
			var field = $(item);
			if (field.hasClass("required") && !$.trim(item.value)) {
				alert("The " + (item.placeholder || item.title) + " field is required.");
				e.preventDefault();
				return false;
			}
			
			//TODO: perform specific validations
		});
	});
	

	var fakePlaceholder = function(items) {
		/* This code is licensed under Creative Commons Attribution 3.0    *
		 * You may share and remix the script so long as you attribute the *
		 * original author, Andrew January.                                *
		 * http://creativecommons.org/licenses/by/3.0/                     */

	    // Check to see if the browser already supports placeholder text (introduced in HTML5). If it does,
	    // then we don't need to do anything.
	    if (!fakingPlaceholders) {
	        return;
	    }
	    
		var valueIsPlaceholder = function(input) {
			return input.value == $(input).attr('placeholder');
		}

		var showPlaceholder = function(input, loading) {
			// FF and IE save values when you refresh the page. If the user refreshes the page
			// with the placeholders showing they will be the default values and the input fields won't
			// be empty. Using loading && valueIsPlaceholder is a hack to get around this and highlight
			// the placeholders properly on refresh.
			if (!input.value || (loading && valueIsPlaceholder(input))) {
				if ($(input).hasClass('password')) {
					// Must use setAttribute rather than jQuery as jQuery throws an exception
					// when changing type to maintain compatability with IE.
					// We use our own "compatability" method by simply swallowing the error.
					try {
						input.setAttribute('type', 'text');
					} catch (e) { }
				}
				input.value = $(input).addClass('placeholder').attr('placeholder');
			}
		}
		
		var hidePlaceholder = function(input) {
			if (valueIsPlaceholder(input) && $(input).hasClass('placeholder')) {
				if ($(input).hasClass('password')) {
					try {
						input.setAttribute('type', 'password');
						// Opera loses focus when you change the type, so we have to refocus it.
						input.focus();
					} catch (e) { }
				}
				
				$(input).val("").removeClass('placeholder');
			}
		}
		
		$(items).each(function(index) {
			var field = $(this);
			// We change the type of password fields to text so their placeholder shows.
			// We need to store somewhere that they are actually password fields so we can convert
			// back when the users types something in.
			if (this.type == 'password') {
				field.addClass('password');
			}

			showPlaceholder(this, true);
			
			field.focus(function() { hidePlaceholder(this) });
			field.blur(function() { showPlaceholder(this, false) });
		});
	}
	
	//load fallback placeholders
	fakePlaceholder($("input[type=text],input[type=password]", editors));
	
	
	//setup globals
	window.madforms = {
			getSettings: getSettings
	};
	
	document.body.focus();
	
	
});



