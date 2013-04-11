var incidentPanelSettings = {
	"contentType" : "elements",
	"groupIdFilter" : -1,
	"refreshInterval" : 10
};
var setIntervalId;
var showEditPanelOnDocLoad = false;

uptimeGadget.registerOnLoadHandler(function(onLoadData) {
	if (onLoadData.hasPreloadedSettings()) {
		onLoadSettingsSuccess(onLoadData.settings);
	} else {
		uptimeGadget.loadSettings(onLoadSettingsSuccess, onError);
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

function renderIncidentPanel(settings) {
	getGroupNames(settings.groupIdFilter, function(groups) {
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
	}, function() {
		$("#incidentPanelGroupDiv").text("Could not load groups");
	});
	getIncidentsIn(settings.groupIdFilter, settings.contentType, function(results) {
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
		$("#incidentPanelTableDiv").html(incidentsTable);
		$('tr.incident').click(function() {
			window.top.location.href = $('a:first', this).attr('href');
		}).hover(function() {
			if ($(this).find("th").length > 0) {
				return;
			}
			$(this).addClass("incidentHover");
		}, function() {
			$(this).removeClass("incidentHover");
		});
		resizeIncidentPanelTable();
	}, function() {
		$("#incidentPanelTableDiv").html("<p>getIncidentsIn returned an error</p>");
	});
}

function resizeIncidentPanelTable() {
	var heightOfOtherDivs = $('#incidentPanelGroupDiv').height() + $('#incidentPanelSummaryDiv').height() + $('#incidentPanelBarChartDiv').height();
	$('#incidentPanelTableDiv').height($(window).height() - heightOfOtherDivs - 10);
}

function showEditPanel() {
	populateEditPanelGroups();
	$("#editPanel").slideDown();
}

function hideEditPanel() {
	$("#editPanel").slideUp();
}

function onLoadSettingsSuccess(settings) {
	if (settings) {
		$.extend(incidentPanelSettings, settings);
	}
	initEditPanel();

	// var statusBar = $("#statusBar");
	// statusBar.css("color", "green");
	// statusBar.text("Loaded and READY!");
	// statusBar.show().fadeOut(2000);

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
	setIntervalId = setInterval(function() {
		renderIncidentPanel(incidentPanelSettings);
	}, parseInt(incidentPanelSettings.refreshInterval) * 1000);
}

function populateEditPanelGroups() {
	var groups = $("#groups");
	groups.find('option').remove().end().append($("<option />").val(-1).text("All"));
	getGroupNames(-1, function(data) {
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
	var refreshRate = $("#refreshRate");
	refreshRate.val(incidentPanelSettings.refreshInterval);
	refreshRate.change($.debounce(500, function() {
		var refreshRate = $(this);
		var min = parseInt(refreshRate.attr("min"));
		var max = parseInt(refreshRate.attr("max"));
		var val = parseInt(refreshRate.val());
		if (isNaN(val)) {
			val = 10;
		}
		refreshRate.val(val);
		if (val < min) {
			refreshRate.val(min);
		}
		if (val > max) {
			refreshRate.val(max);
		}
		incidentPanelSettings.refreshInterval = val;
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
	uptimeGadget.saveSettings(incidentPanelSettings, onSaveSuccess, onError);
}

function onSaveSuccess(savedSettings) {

}

function onError(errorObject) {
	var statusBar = $("#statusBar");
	statusBar.css("color", "red");

	statusBar.text(errorObject.code + ": " + errorObject.description);
	statusBar.show().fadeOut(2000);
}
