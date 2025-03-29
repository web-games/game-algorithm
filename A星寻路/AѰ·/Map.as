package {
	import flash.display.Sprite;
	import flash.events.Event;
	import flash.events.MouseEvent;
	import flash.geom.Point;
	import flash.utils.Timer;

	public class Map {
		public var B:int;
		public var L:int;
		public var R:int;
		public var T:int;
		private var maps:Array=[];

		public function Map(cols:uint=100, rows:uint=100) {
			for (var x:int=0; x < cols; x++) {
				maps[x]=[];
				for (var y:int=0; y < rows; y++) {
					var tg:int=(x > 0 || y > 0) ? Math.floor(Math.random() * 10) % 2 : 0;
					var node:Node=new Node(x, y, tg);
					maps[x][y]=node;
				}
			}
			L=0, T=0;
			R=maps.length - 1;
			B=maps[0].length - 1;
		}

		/**
		 *  该方法为配合显示地图用，实际不需要；
		 */
		public function getBlockElement(no_X:uint, no_Y:uint):Node {
			if (no_X > R || no_X < L || no_Y < T || no_Y > B) {
				return null;
			}
			var node:Node=maps[no_X][no_Y] as Node;
			if (node.isBlock) {
				return node;
			}
			return null;
		}

		public function getElement(no_X:uint, no_Y:uint):Node {
			if (no_X > R || no_X < L || no_Y < T || no_Y > B) {
				return null;
			}
			var node:Node=maps[no_X][no_Y] as Node;
			if (!node.isBlock) {
				return node;
			}
			return null;
		}
	}
}