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
			root.addChild(tree);
			return;
		}
		var parentTree = treeNodes[group.groupId];
		if (!parentTree) {
			parentTree = new Tree();
			treeNodes[group.groupId] = parentTree;
		}
		parentTree.addChild(tree);
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

function getGroupNames(onSuccess, onError) {
	$.ajax("/api/v1/groups", {
		cache : false,
		success : function(data, textStatus, jqXHR) {
			var groupTreeInfo = buildGroupTree(data);
			if (!groupTreeInfo) {
				onError();
				return;
			}
			var groups = [];
			tree_walk(groupTreeInfo.rootTree, function(group, depth) {
				if (!group) {
					return;
				}
				groups.push({id: group.id, name: getIndentPrefix("-", depth - 1) + group.name});
			});
			onSuccess(groups);
		},
		error : function(jqXHR, textStatus, errorThrown) {
			onError();
		}
	});
}

function getDeferredGroupStatuses(groupIds, onSuccess) {
	var deferreds = [];
	$.each(groupIds, function(i, groupId) {
		deferreds.push($.ajax("/api/v1/groups/" + groupId + "/status", {
			cache : false,
			success : onSuccess,
			error : function(jqXHR, textStatus, errorThrown) {
				onError();
			}
		}));
	});
	return deferreds;
}

function getStatusesIn(groupId, idName, onSuccess, onError) {
	if (!groupId) {
		onError();
		return;
	}
	if (idName != "elements" && idName != "monitors") {
		onError();
		return;
	}
	var statusType = (idName == "elements") ? "elementStatus" : "monitorStatus";
	$.ajax("/api/v1/groups", {
		cache : false,
		success : function(data, textStatus, jqXHR) {
			var groupTree = getGroupTree(groupId, data);
			if (!groupTree) {
				onError();
				return;
			}
			var groupIds = [];
			tree_walk(groupTree, function(group) {
				if (!group) {
					return;
				}
				groupIds.push(group.id);
			});
			var statuses = [];
			var deferreds = getDeferredGroupStatuses(groupIds, function(data, textStatus, jqXHR) {
				statuses.push.apply(statuses, data[statusType]);
			});
			$.when.apply($, deferreds).done(function() {
				onSuccess(statuses);
			});
		},
		error : function(jqXHR, textStatus, errorThrown) {
			onError();
		}
	});
}
