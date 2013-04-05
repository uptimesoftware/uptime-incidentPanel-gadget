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

$(function() {
	$("#editPanel").hide();
	if (showEditPanelOnDocLoad) {
		showEditPanel();
	}
});

function renderIncidentPanel(settings) {
	var message = '<p>TODO render table ' + setIntervalId + '</p>';
	getIdsIn(settings.groupIdFilter, settings.contentType, function(ids) {
		message += "<p>Got ids: " + ids + "</p>";
		$("#incidentPanel").html(message);
	}, function() {
		message += "<p>getIdsIn returned an error</p>";
		$("#incidentPanel").html(message);
	});
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

	var statusBar = $("#statusBar");
	statusBar.css("color", "green");
	statusBar.text("Loaded and READY!");
	statusBar.show().fadeOut(2000);

	resetUpdateInterval();

	if (!settings) {
		showEditPanelOnDocLoad = true;
	}
}

function resetUpdateInterval() {
	if (setIntervalId) {
		clearInterval(setIntervalId);
	}
	setIntervalId = setInterval(function() {
		renderIncidentPanel(incidentPanelSettings);
	}, parseInt(incidentPanelSettings.refreshInterval) * 1000);
}

function populateEditPanelGroups() {
	var groups = $("#groups");
	groups.find('option').remove().end().append($("<option />").val(-1).text("All"));
	$.ajax("/api/v1/groups", {
		cache : false,
		success : function(data, textStatus, jqXHR) {
			$(data).each(function(i, group) {
				groups.append($("<option />").val(group.id).text(group.name));
			});
			groups.val(incidentPanelSettings.groupIdFilter);
		},
		error : function(jqXHR, textStatus, errorThrown) {
			groups.val(-1);
		}
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
