var escapeHTML = (function () {
    var entityMap = { '"': '&quot;', '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '/': '&#x2F;' };
    return function(text) {
        return text.replace(/["&<>'\/]/g, function (a) { return entityMap[a]; });
    };
}());

function renderIncidentsTable(contentType, incidents, elements) {
	var html = "";
	var elementIdField = contentType == "elements" ? "id" : "elementId";
	$.each(incidents, function(i, status) {
		var element = elements[status[elementIdField]];
		html += "<p>" + contentType + " " + status.id + ": " + element.type + " " + element.typeSubtype + " "
				+ escapeHTML(element.name) + " " + escapeHTML(status.name) + " " + status.status + "</p>";
	});
	return html;
}
