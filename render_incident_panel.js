var escapeHTML = (function() {
	var entityMap = {
		'"' : '&quot;',
		'&' : '&amp;',
		'<' : '&lt;',
		'>' : '&gt;',
		"'" : '&#39;',
		'/' : '&#x2F;'
	};
	return function(text) {
		return text.replace(/["&<>'\/]/g, function(a) {
			return entityMap[a];
		});
	};
}());

function cell(data, field, link) {
	var linkPrefix = "";
	var linkSuffix = "";
	if (link) {
		linkPrefix = '<a href="' + link + '">';
		linkSuffix = "</a>";
	}
	return '<td class="' + field + '">' + linkPrefix + escapeHTML(data[field]) + linkSuffix + "</td>";
}

function renderIncidentsSummary(contentType, statusCounts) {
	var html = '<table class="incidentsSummary">';
	html += '<tr><td class="incidentSummary CRIT"><div class="incidentSummaryCount">'
			+ statusCounts.CRIT
			+ '</div><div class="incidentSummaryLegend">CRIT</div></td>' 
			+ '<td class="incidentSummary OTHER"><div class="incidentSummaryCount">'
			+ statusCounts.OTHER
			+ '</div><div class="incidentSummaryLegend">OTHER</div></td>'
			+ '<td class="incidentSummary OK"><div class="incidentSummaryCount">'
			+ statusCounts.OK + '</div><div class="incidentSummaryLegend">OK</div></td></tr>';
	return html + "</table>";
}

var incidentsTableSort = (function() {
	var statusMap = {
		'CRIT' : 0,
		'WARN' : 1,
		'MAINT' : 2,
		'UNKNOWN' : 3,
		'OK' : 4,
	};
	return function(arg1, arg2) {
		var sort = statusMap[arg1.status] - statusMap[arg2.status];
		if (sort != 0) {
			return sort;
		}
		sort = naturalSort(arg1.element.name, arg2.element.name);
		if (sort != 0) {
			return sort;
		}
		sort = naturalSort(arg1.name, arg2.name);
		if (sort != 0) {
			return sort;
		}
		return 0;
	};
}());

function incidentsTableCells(contentType, status) {
	var element = status.element;
	if (contentType == "elements") {
		return cell(element, "type") + cell(element, "typeSubtype")
				+ cell(element, "name", uptimeGadget.getElementUrls(element.id, element.name).graphing) + cell(status, "status");
	}
	return cell(element, "type") + cell(element, "typeSubtype") + cell(element, "name")
			+ cell(status, "name", uptimeGadget.getMonitorUrl(status.id)) + cell(status, "status");
}

function renderIncidentsTable(contentType, incidents, elements) {
	var html = '<table class="incidentsTable">';
	var elementIdField = contentType == "elements" ? "id" : "elementId";
	var incidentsAndElements = $.map(incidents, function(incident, i) {
		incident.element = elements[incident[elementIdField]];
		return incident;
	});
	incidentsAndElements.sort(incidentsTableSort);
	$.each(incidentsAndElements, function(i, status) {
		html += '<tr class="incident ' + contentType + " " + status.status + '">';
		html += incidentsTableCells(contentType, status);
		html += "</tr>";
	});
	return html + "</table>";
}
