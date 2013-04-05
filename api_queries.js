function getIdsIn(groupId, idName, onSuccess, onError) {
	if (!groupId) {
		onError();
		return;
	}
	if (idName != "elements" && idName != "monitors") {
		onError();
		return;
	}
	$.ajax("/api/v1/groups", {
		cache : false,
		success : function(data, textStatus, jqXHR) {
			var treeNodes = {};
			var root = new Tree();
			$.each(data, function(i, group) {
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
			var groupTree = treeNodes[groupId];
			if (!groupTree) {
				onError();
				return;
			}
			var ids = [];
			tree_walk(groupTree, function(group) {
				$.each(group[idName], function(i, item) {
					if (item.isMonitored) {
						ids.push(item.id);
					}
				});
			});
			onSuccess(ids);
		},
		error : function(jqXHR, textStatus, errorThrown) {
			onError();
		}
	});
}
