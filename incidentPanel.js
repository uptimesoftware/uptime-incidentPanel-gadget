var incidentPanelSettings = {
	"contentType" : "elements",
	"groupIdFilter" : -1,
	"ignorePowerStateOff" : false,
	"refreshInterval" : 10
};
var setIntervalId;
var showEditPanelOnDocLoad = false;
var divsToDim = [ '#editPanel', '#incidentPanel' ];

uptimeGadget.registerOnLoadHandler(function(onLoadData) {
	if (onLoadData.hasPreloadedSettings()) {
		onLoadSettingsSuccess(onLoadData.settings);
	} else {
		uptimeGadget.loadSettings().then(onLoadSettingsSuccess, function(error) {
			renderIncidentPanelError(error, "Error Loading Gadget Settings");
		});
	}
});

uptimeGadget.registerOnEditHandler(showEditPanel);

uptimeGadget.registerOnResizeHandler($.debounce(500, resizeIncidentPanelTable));

$(function() {
	$("#incidentPanelGadget").tooltip();
	$("#editPanel").hide();
	if (showEditPanelOnDocLoad) {
		showEditPanel();
	}
});

function clearNotificationPanel() {
	$('#notificationPanel').slideUp().empty();
	gadgetDimOff();
}

function renderGroupText(groups, settings) {
	var groupsMarkup = "";
	$.each(groups, function(i, group) {
		groupsMarkup += escapeHTML(group.name) + "<br/>";
	});
	var titleText = (settings.contentType == "elements") ? "Element Incidents in " : "Monitor Incidents in ";
	if (settings.groupIdFilter < 0) {
		$("#incidentPanelGroupDiv").text(titleText + "All Groups").prop('title', groupsMarkup);
		return;
	}
	$("#incidentPanelGroupDiv").text(titleText + groups[0].name).prop('title', groupsMarkup);
}

function renderIncidentPanelError(error, msg) {
	var notificationPanel = $('#notificationPanel').empty();
	var errorBox = uptimeErrorFormatter.getErrorBox(error, msg);
	errorBox.appendTo(notificationPanel);
	gadgetDimOn();
	notificationPanel.slideDown();
}

function onTableRowClick(e) {
	window.top.location.href = $('a:first', e.currentTarget).attr('href');
}

function renderIncidentPanelTable(results, settings) {
	clearNotificationPanel();
	$('#incidentPanelSummaryDiv div.incidentSummaryCount').each(function() {
		var $this = $(this);
		if ($this.hasClass('CRIT')) {
			$this.text(results.statusCounts.CRIT);
		} else if ($this.hasClass('OTHER')) {
			$this.text(results.statusCounts.OTHER);
		} else {
			$this.text(results.statusCounts.OK);
		}
	});
	$('#incidentPanelBarChartRow').html(renderIncidentsBarChartPercentages(results.statusCounts));
	var incidentsTable = renderIncidentsTable(settings.contentType, results.incidents, results.elements);
	$('tr.incident').off('click');
	document.getElementById("incidentPanelTableDiv").innerHTML = incidentsTable;
	$('tr.incident').click(onTableRowClick);
	resizeIncidentPanelTable();
}

function renderIncidentPanel(settings) {
	getGroupNames(settings.groupIdFilter).then(function(groups) {
		renderGroupText(groups, settings);
	}, function() {
		$("#incidentPanelGroupDiv").text("Error: Could not load groups");
	});
	getIncidentsIn(settings.groupIdFilter, settings.contentType, settings.ignorePowerStateOff).then(function(results) {
		renderIncidentPanelTable(results, settings);
	}, function(error) {
		renderIncidentPanelError(error, "Error Loading Incident Data");
	});
}

function resizeIncidentPanelTable() {
	var heightOfOtherDivs = $('#incidentPanelGroupDiv').height() + $('#incidentPanelSummaryDiv').height()
			+ $('#incidentPanelBarChartDiv').height();
	$('#incidentPanelTableDiv').height($(window).height() - heightOfOtherDivs);
}

function disableSettings() {
	$('.incident-panel-setting').prop('disabled', true);
	$('div.contentType').buttonset('disable');
	$('#closeButton').prop('disabled', true).addClass("ui-state-disabled");
}

function enableSettings() {
	$('.incident-panel-setting').prop('disabled', false);
	$('div.contentType').buttonset('enable');
	$('#closeButton').prop('disabled', false).removeClass("ui-state-disabled");
}

function gadgetDimOn() {
	$.each(divsToDim, function(i, d) {
		var div = $(d);
		if (div.is(':visible') && div.css('opacity') > 0.6) {
			div.fadeTo('slow', 0.3);
		}
	});
}

function gadgetDimOff() {
	$.each(divsToDim, function(i, d) {
		var div = $(d);
		if (div.is(':visible') && div.css('opacity') < 0.6) {
			div.fadeTo('slow', 1);
		}
	});
}

function showEditPanel() {
	disableSettings();
	populateEditPanelGroups().then(function() {
		enableSettings();
	});
	$("#editPanel").slideDown();
}

function hideEditPanel() {
	$("#editPanel").slideUp();
}

function onLoadSettingsSuccess(settings) {
	clearNotificationPanel();
	if (settings) {
		$.extend(incidentPanelSettings, settings);
	}
	initEditPanel();

	resetUpdateInterval();

	if (!settings) {
		showEditPanelOnDocLoad = true;
	}
}

function resetUpdateInterval() {
	if (setIntervalId) {
		clearInterval(setIntervalId);
	} else {
		renderIncidentPanel(incidentPanelSettings);
	}
	var refreshInterval = parseInt(incidentPanelSettings.refreshInterval);
	if (refreshInterval > 0) {
		setIntervalId = setInterval(function() {
			renderIncidentPanel(incidentPanelSettings);
		}, refreshInterval * 1000);
	}
}

function populateEditPanelGroups() {
	var groups = $("#groups");
	groups.find('option').remove().end().append($("<option />").val(-1).text("Loading..."));
	return getGroupNames(-1).then(function(data) {
		groups.empty().append($("<option />").val(-1).text("All"));
		$.each(data, function(i, group) {
			groups.append($("<option />").val(group.id).text(group.name));
		});
		groups.val(incidentPanelSettings.groupIdFilter);
	}, function() {
		groups.val(-1);
	});
}

function initEditPanel() {
	var contentTypes = $('input:radio[name=contentType]');
	if (contentTypes.is(':checked') === false) {
		contentTypes.filter('[value=' + incidentPanelSettings.contentType + ']').prop('checked', true);
	}
	contentTypes.change(function() {
		incidentPanelSettings.contentType = $(this).val();
		saveSettings();
	});
	$('div.contentType').buttonset();
	var ignorePoweredOffElements = $('#ignorePoweredOffElements');
	if (ignorePoweredOffElements.is(':checked') === false) {
		ignorePoweredOffElements.prop('checked', incidentPanelSettings.ignorePowerStateOff);
	}
	ignorePoweredOffElements.change(function() {
		incidentPanelSettings.ignorePowerStateOff = $(this).prop('checked');
		saveSettings();
	});
	var refreshRate = $("#refreshRate");
	refreshRate.val(incidentPanelSettings.refreshInterval);
	refreshRate.change($.debounce(500, function() {
		incidentPanelSettings.refreshInterval = $(this).val();
		resetUpdateInterval();
		saveSettings();
	}));
	$("#groups").change(function() {
		incidentPanelSettings.groupIdFilter = $(this).val();
		saveSettings();
	});
	$("#closeButton").button().click(function() {
		saveSettings();
		hideEditPanel();
	});
}

function saveSettings() {
	uptimeGadget.saveSettings(incidentPanelSettings).then(onSaveSuccess, function(error) {
		renderIncidentPanelError(error, "Error Saving Gadget Settings");
	});
}

function onSaveSuccess(savedSettings) {
	clearNotificationPanel();
	renderIncidentPanel(incidentPanelSettings);
}
