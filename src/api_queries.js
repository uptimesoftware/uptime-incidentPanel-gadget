function groupNameSort(group1, group2) {
	return naturalSort(group1.name, group2.name);
}

function buildGroupTree(groups) {
	var treeNodes = {};
	var root = new Tree();
	$.each(groups, function(i, group) {
		var tree = treeNodes[group.id];
		if (!tree) {
			tree = new Tree(group);
			treeNodes[group.id] = tree;
		} else {
			tree.data = group;
		}
		if (group.groupId == null) {
			root.addChild(tree, groupNameSort);
			return;
		}
		var parentTree = treeNodes[group.groupId];
		if (!parentTree) {
			parentTree = new Tree();
			treeNodes[group.groupId] = parentTree;
		}
		parentTree.addChild(tree, groupNameSort);
	});
	return {
		treeNodes : treeNodes,
		rootTree : root
	};
}

function getGroupTree(groupId, groups) {
	var groupTreeInfo = buildGroupTree(groups);
	if (groupId < 0) {
		return groupTreeInfo.rootTree;
	}
	return groupTreeInfo.treeNodes[groupId];
}

function getIndentPrefix(prefix, repeat) {
	var repeatedPrefix = "";
	var indent = repeat;
	while (indent-- > 0) {
		repeatedPrefix += prefix;
	}
	return repeatedPrefix;
}

function getGroupNames(groupId) {
	var deferred = UPTIME.pub.gadgets.promises.defer();
	$.ajax("/api/v1/groups", {
		cache : false
	}).done(function(data, textStatus, jqXHR) {
		var groupTree = getGroupTree(groupId, data);
		if (!groupTree) {
			deferred.resolve([]);
			return;
		}
		var groups = [];
		var depthOffset = (groupId < 0) ? -1 : 0;
		tree_walk(groupTree, function(group, depth) {
			if (!group) {
				return;
			}
			groups.push({
				id : group.id,
				name : getIndentPrefix("-", depth + depthOffset) + group.name
			});
		});
		deferred.resolve(groups);
	}).fail(function(jqXHR, textStatus, errorThrown) {
		deferred.reject(UPTIME.pub.errors.toDisplayableJQueryAjaxError(jqXHR, textStatus, errorThrown, this));
	});
	return deferred.promise;
}

function getGroupStatuses(groupIds, statusType) {
	var promises = [];
	$.each(groupIds, function(i, groupId) {
		var deferred = UPTIME.pub.gadgets.promises.defer();
		$.ajax("/api/v1/groups/" + groupId + "/status", {
			cache : false
		}).done(function(data, textStatus, jqXHR) {
			deferred.resolve(data);
		}).fail(function(jqXHR, textStatus, errorThrown) {
			deferred.reject(UPTIME.pub.errors.toDisplayableJQueryAjaxError(jqXHR, textStatus, errorThrown, this));
		});
		promises.push(deferred.promise);
	});
	var statuses = [];
	return UPTIME.pub.gadgets.promises.all(promises).then(function(allData) {
		$.each(allData, function(i, data) {
			statuses.push.apply(statuses, data[statusType]);
		});
		return statuses;
	});
}

function getStatusesIn(groupId, idName) {
	if (!groupId) {
		return UPTIME.pub.gadgets.promises.reject("Internal error: getStatusesIn(); groupId must be defined.");
	}
	if (idName != "elements" && idName != "monitors") {
		return UPTIME.pub.gadgets.promises.reject("Internal error: getStatusesIn(); idName must be either elements or monitors.");
	}
	var statusType = (idName == "elements") ? "elementStatus" : "monitorStatus";
	var deferred = UPTIME.pub.gadgets.promises.defer();
	$.ajax("/api/v1/groups", {
		cache : false
	}).done(function(data, textStatus, jqXHR) {
		var groupTree = getGroupTree(groupId, data);
		if (!groupTree) {
			onSuccess([]);
			return;
		}
		var groupIds = [];
		tree_walk(groupTree, function(group) {
			if (!group) {
				return;
			}
			groupIds.push(group.id);
		});
		getGroupStatuses(groupIds, statusType).then(function(statuses) {
			deferred.resolve(statuses);
		}, function(jqXHR, textStatus, errorThrown) {
			deferred.reject(UPTIME.pub.errors.toDisplayableJQueryAjaxError(jqXHR, textStatus, errorThrown, this));
		});
	}).fail(function(jqXHR, textStatus, errorThrown) {
		deferred.reject(UPTIME.pub.errors.toDisplayableJQueryAjaxError(jqXHR, textStatus, errorThrown, this));
	});
	return deferred.promise;
}

function getElements(ids) {
	if (!ids) {
		return UPTIME.pub.gadgets.promises.reject("Internal error: getElements(); ids must be defined.");
	}
	var promises = [];
	$.each(ids, function(i, id) {
		var deferred = UPTIME.pub.gadgets.promises.defer();
		$.ajax("/api/v1/elements/" + id, {
			cache : false
		}).done(function(data, textStatus, jqXHR) {
			deferred.resolve(data);
		}).fail(function(jqXHR, textStatus, errorThrown) {
			deferred.reject(UPTIME.pub.errors.toDisplayableJQueryAjaxError(jqXHR, textStatus, errorThrown, this));
		});
		promises.push(deferred.promise);
	});
	return UPTIME.pub.gadgets.promises.all(promises).then(function(allData) {
		var elements = {};
		$.each(allData, function(i, data) {
			elements[data.id] = data;
		});
		return elements;
	});
}

function uniq(arr) {
	var seen = {};
	return $.map(arr, function(item, i) {
		if (seen[item]) {
			return null;
		}
		seen[item] = 1;
		return item;
	});
}

function shouldIgnore(status, ignorePowerStateOff) {
	return !status.isMonitored || (typeof status.isHidden === 'boolean' && status.isHidden)
			|| (ignorePowerStateOff && (status.powerState && status.powerState == "Off"));
}

function getIncidentsIn(groupId, idName, ignorePowerStateOff) {
	if (!groupId) {
		return UPTIME.pub.gadgets.promises.reject("Internal error: getIncidentsIn(); groupId must be defined.");
	}
	if (idName != "elements" && idName != "monitors") {
		return UPTIME.pub.gadgets.promises
				.reject("Internal error: getIncidentsIn(); idName must be either elements or monitors.");
	}
	var idField = (idName == "elements") ? "id" : "elementId";
	var statusCounts = {
		CRIT : 0,
		OTHER : 0,
		OK : 0
	};
	var statusesToShow = [];
	return getStatusesIn(groupId, idName).then(function(statuses) {
		$.each(statuses, function(i, status) {
			if (shouldIgnore(status, ignorePowerStateOff)) {
				return;
			}
			if ("OK" == status.status) {
				statusCounts.OK++;
			} else if ("CRIT" == status.status) {
				statusesToShow.push(status);
				statusCounts.CRIT++;
			} else {
				statusesToShow.push(status);
				statusCounts.OTHER++;
			}
		});
		var elementIds = uniq($.map(statusesToShow, function(status, i) {
			return status[idField];
		}));
		return getElements(elementIds);
	}).then(function(elems) {
		return {
			incidents : statusesToShow,
			elements : elems,
			statusCounts : statusCounts
		};
	});
}
