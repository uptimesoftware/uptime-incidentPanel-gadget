function Tree(data) {
	this.firstChild;
	this.nextSibling;
	this.data = data;

	this.addChild = function(child) {
		var next = this.firstChild;
		if (!next) {
			this.firstChild = child;
			return;
		}
		while (next.nextSibling) {
			next = next.nextSibling;
		}
		next.nextSibling = child;
	};
}

function tree_walk(tree, visitor, depth) {
	if (!tree) {
		return;
	}
	depth = depth || 0;
	visitor(tree.data, depth);
	tree = tree.firstChild;
	depth++;
	while (tree) {
		tree_walk(tree, visitor, depth);
		tree = tree.nextSibling;
	}
}

function tree_find(tree, matcher) {
	if (!tree || matcher(tree.data)) {
		return tree;
	}
	tree = tree.firstChild;
	while (tree) {
		var match = tree_find(tree, matcher);
		if (match) {
			return match;
		}
		tree = tree.nextSibling;
	}
}
