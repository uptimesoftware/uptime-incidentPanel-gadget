function Tree(data) {
	this.firstChild;
	this.nextSibling;
	this.data = data;

	this.addChild = function(child) {
		if (!this.firstChild) {
			this.firstChild = child;
			return;
		}
		var next = this;
		while (next.nextSibling) {
			next = next.nextSibling;
		}
		next.nextSibling = child;
	};
}

function tree_walk(tree, visitor) {
	if (!tree) {
		return;
	}
	visitor(tree.data);
	tree = tree.firstChild;
	while (tree) {
		tree_walk(tree, visitor);
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
