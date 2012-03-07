// ==UserScript==
// @name ImperialUnitConverter
// @namespace Aaronut
// @version 0.1
// @description Converts imperial measurements to metric and vice vers
// @include http://*cooking.stackexchange.com/questions*
// @include http://*cooking.stackexchange.com/review*
// @include http://*cooking.stackexchange.com/admin/dashboard*
// ==/UserScript==

function inject(f) {
	var script = document.createElement("script");
	script.type = "text/javascript";
	script.textContent = "(" + f.toString() + ")(jQuery)";
	document.body.appendChild(script);
}

inject(function ($) {
	var conversions = [
		[ "(°|deg(ree)?s?)?\\s*f(a(h?)hrenheit)?", "° C", 0, 0,
			function(q) { return (q - 32) * 5 / 9; } ],
		[ "(tsps?\\.?|teaspoons?)", " mL", 0, 0,
			function(q) { return q * 4.92892159; } ],
		[ "(tbs(ps?)?\\.?|tablespoons?)", " mL", 0, 0,
			function(q) { return q * 14.7867648; } ],
		[ "(fl(\\.|uid)?)\\s+(oz\\.?|ounces?)", " mL", 0, 0,
			function(q) { return q * 29.573529; } ],
		[ "(oz\\.?|ounces?)", " g", 0, 0,
			function(q) { return q * 28.3495231; } ],
		[ "c(ups?)?", "mL", 0, 20,
			function(q) { return q * 236.588237; } ],
		[ "(qts?\\.?|quarts?)", " L", 0, 0,
			function(q) { return q * 0.946352946; } ],
		[ "(lbs?\\.?|pounds?)", " kg", 0, 0,
			function(q) { return q * 0.45359237; } ]
	];
	
	function isInLink(s, index) {
		var lower = s.toLowerCase();
		var startTagIndex = lower.indexOf("<a ", index);
		var endTagIndex = lower.indexOf("</a>", index);
		return (endTagIndex > 0) && ((startTagIndex < 0) || (endTagIndex < startTagIndex));
	}
	
	function replaceAt(s, index, length, content) {
		return s.slice(0, index) + content + s.slice(index + length);
	}
	
	$(function() {
		$('<style type="text/css"> ' +
			'.converted-measurement { ' +
				'border-bottom: 1px dotted #999; ' +
				'cursor: help; ' +
				'color: #444 ' +
			'} ' +
		'</style>').appendTo("head");
		// todo: Support temperature ranges, "-" or "to"
		$("div.post-text").each(function(index, item) {
			var hasMatches = false;
			var html = $(this).html();
			var changes = [];
			for (var c in conversions) {
				var conversion = conversions[c];
				var expression = conversion[0];
				var target = conversion[1];
				var min = conversion[2];
				var max = conversion[3];
				var convert = conversion[4];
				var pattern = new RegExp("(((\\d+/)|(\\d*\\.))?(\\d+))\\s*" + expression + "\\b", "ig");
				while ((result = pattern.exec(html)) != null) {
					if (isInLink(html, result.index))
						continue;
					hasMatches = true;
					var fracIndex = result[1].indexOf("/");
					var quantity = (fracIndex >= 0) ?
						(parseFloat(result[1].substring(0, fracIndex)) / 
						 parseFloat(result[1].substring(fracIndex + 1))) :
						parseFloat(result[1]);
					if ((quantity < min) ||
						((max > 0) && (quantity > max)))
						continue;
					var converted = convert(quantity);
					if (converted > 10)
						converted = Math.round(converted);
					else if (converted > 1)
						converted = Math.round(converted * 10) / 10;
					else
						converted = Math.round(converted * 100) / 100;
					var change = {
						index: result.index,
						matched: result[0],
						converted: converted,
						unit: target
					};
					changes.push(change);
				}
			}
			if (!hasMatches)
				return;
			var newHtml = html;
			changes.sort(function (a, b) { return a.index - b.index; });
			var offset = 0;
			for (var ch in changes) {
				var change = changes[ch];
				var linkHtml =
					'<a class="converted-measurement" title="' + 
					change.converted + change.unit + '">' +
						change.matched +
					'</a>';
				newHtml = replaceAt(newHtml, change.index + offset, change.matched.length, linkHtml);
				offset += linkHtml.length - change.matched.length;
			}
			$(this).html(newHtml);
		});
	});
});