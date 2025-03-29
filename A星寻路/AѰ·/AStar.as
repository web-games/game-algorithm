package {
	import flash.utils.Dictionary;
	import flash.utils.getTimer;

	public class AStar {
		/**
		 * 对角移动付出的代价
		 */
		private const COST_DIAGONAL:int=14;
		/**
		 * 直线移动付出的代价
		 */
		private const COST_STRAIGHT:int=10;
		/**
		 * 关闭列表（不再处理的节点）
		 */
		private var closeList:Array=[];
		/**
		 * 当前节点
		 */
		private var count:Node;
		/**
		 * 结束节点
		 */
		private var endNode:Node;
		/**
		 * 地图
		 */
		private var map:Map;
		private var maxPath:int=500;
		/**
		 * 开放列表（等待处理的节点）
		 */
		private var openList:Array=[];
		/**
		 * 父节点路径
		 */
		private var parentNodes:Array;
		/**
		 * 开始节点
		 */
		private var startNode:Node;
		private var time:int=0;

		public function AStar(mapData:Map) {
			map=mapData;
		}

		/**
		 *  检测四周的节点
		 */
		public function detectionAround():void {
			var no_X:int=count.no_X;
			var no_Y:int=count.no_Y;
			addOpenList(map.getElement(no_X - 1, no_Y), COST_STRAIGHT); //左
			addOpenList(map.getElement(no_X + 1, no_Y), COST_STRAIGHT); //右			
			addOpenList(map.getElement(no_X, no_Y - 1), COST_STRAIGHT); //上
			addOpenList(map.getElement(no_X, no_Y + 1), COST_STRAIGHT); //下
			addOpenList(map.getElement(no_X + 1, no_Y - 1), COST_DIAGONAL);
			addOpenList(map.getElement(no_X + 1, no_Y + 1), COST_DIAGONAL);
			addOpenList(map.getElement(no_X - 1, no_Y - 1), COST_DIAGONAL);
			addOpenList(map.getElement(no_X - 1, no_Y + 1), COST_DIAGONAL);
			openList.sortOn('F', Array.NUMERIC);
		}

		/**
		 * 开始寻路;
		 */
		public function findPath(startX:int, startY:int, endX:int, endY:int):Array {
			openList=[];
			closeList=[];
			startNode=null;
			endNode=null;
			count=null;
			startNode=map.getElement(startX, startY);
			endNode=map.getElement(endX, endY);
			if (!startNode || !endNode) {
				return [];
			}
			/**用于计算寻路的节点的尝试次数！*/
			time=0;
			parentNodes=[];
			startNode.parentNode=null;
			openList.push(startNode);
			while (true) {
				if (openList.length < 1 || time >= maxPath) {
					return [];
				}
				count=openList.shift();
				if (count == endNode) {
					while (count.parentNode != startNode.parentNode) {
						parentNodes.push(count);
						count=count.parentNode;
					}
					return parentNodes;
					break;
				}
				closeList.push(count);
				detectionAround();
				time++;
			}
			return null;
		}

		/**
		 * 路径评估(距离优先);
		 */
		public function getFGH(node:Node, cost:int):void {
			var g:int=count.G + cost;
			node.G=g < node.G ? g + cost : node.G;
			node.H=(Math.abs(node.no_X - endNode.no_X) + Math.abs(node.no_Y - endNode.no_Y)) * 10;
			node.F=node.G + node.H;
		}

		/**
		 *添加一个节点到开放列表
		 * @param node
		 */
		private function addOpenList(node:Node, cost:int):Boolean {
			/**可走且不在关闭列表里*/
			if (node && !node.isBlock && closeList.indexOf(node) < 0) {
				/**不在开放列表中*/
				if (openList.indexOf(node) < 0) {
					node.G=0;
					node.F=0;
					node.H=0;
					node.parentNode=count;
					getFGH(node, cost);
					openList.push(node);
					return true;
				}
			}
			return false;
		}
	}
}