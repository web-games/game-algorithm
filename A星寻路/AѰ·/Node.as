package {

	public class Node {
		public var F:int=0;
		public var G:int=0;
		public var H:int=0;
		public var no_X:int;
		public var no_Y:int;
		public var parentNode:Node;
		private var tongguo:int;

		public function Node(no_x:int, no_y:int, p_tg:int) {
			this.no_X=no_x;
			this.no_Y=no_y;
			this.tongguo=p_tg;
		}

		public function get isBlock():Boolean {			
			return tongguo == 1;
		}
	}
}