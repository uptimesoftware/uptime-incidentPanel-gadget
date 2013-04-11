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
		return  cell(status, "status") + cell(element, "typeName") + cell(element, "typeSubtypeName")
				+ cell(element, "name", uptimeGadget.getElementUrls(element.id, element.name).graphing);
	}
	return cell(status, "status") + cell(element, "typeName") + cell(element, "typeSubtypeName") + cell(element, "name")
			+ cell(status, "name", uptimeGadget.getMonitorUrl(status.id));
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

function getIncidentsBarChartCellWidth(count, total) {
	var percent = Math.round(count * 100 / total);
	if (percent < 1) {
		percent = 1;
	}
	return percent;
}

function getIncidentsBarChartCell(percent, count, countType) {
	return '<td width="' + percent + '%" class="incidentPanelBarChart ' + countType + '" title="' + count + '">&nbsp;</td>';
}

function renderIncidentsBarChartPercentages(counts) {
	var total = counts.CRIT + counts.OTHER + counts.OK;
	if (total == 0) {
		return '<td width="100%" class="incidentPanelBarChart OK"></td>';
	}
	var html = '';
	var critWidth = 0;
	if (counts.CRIT > 0) {
		critWidth = getIncidentsBarChartCellWidth(counts.CRIT, total);
		html += getIncidentsBarChartCell(critWidth, counts.CRIT, 'CRIT');
	}
	var otherWidth = 0;
	if (counts.OTHER > 0) {
		otherWidth = getIncidentsBarChartCellWidth(counts.OTHER, total);
		html += getIncidentsBarChartCell(otherWidth, counts.OTHER, 'OTHER');
	}
	html += getIncidentsBarChartCell((100 - critWidth - otherWidth), counts.OK, 'OK');
	return html;
}
