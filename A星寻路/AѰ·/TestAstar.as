package {
	import flash.display.Shape;
	import flash.display.Sprite;
	import flash.events.Event;
	import flash.events.MouseEvent;
	import flash.text.TextField;
	import flash.utils.getTimer;

	[SWF(width="800", height="800")]
	public class TestAstar extends Sprite {
		private var aStar:AStar;
		private var map:Map;
		private var box:Shape;
		private var paths:Array;
		private var startX:uint;
		private var startY:uint;
		private var txt:TextField;

		public function TestAstar() {
			map=new Map();
			aStar=new AStar(map);
			drawMap();
			txt=new TextField();
			txt.x=10;
			txt.width=stage.stageWidth;
			txt.height=20;
			txt.background=true;
			txt.selectable=false;
			txt.multiline=false;
			txt.textColor=0xff0000;
			txt.border=true;
			txt.text='Click to start find path to target.';
			addChild(txt);
			box=new Shape();
			box.graphics.beginFill(0xff0000);
			box.graphics.drawRect(0, 0, 10, 10);
			box.graphics.endFill();
			stage.addEventListener(MouseEvent.CLICK, onClick);
			stage.addEventListener(Event.ENTER_FRAME, onFrame);
			while (!map.getElement(startX, startY)) {
				if (startX < map.R) {
					startX+=1;
				} else if (startY < map.B) {
					startY+=1;
				} else {
					break;
				}
			}
		}

		private function drawMap():void {
			graphics.clear();
			graphics.beginFill(0x666666);
			for (var x:int=0; x < map.R + 1; x++) {
				for (var y:int=0; y < map.B + 1; y++) {
					var node:Node=map.getBlockElement(x, y);
					if (node) {
						graphics.drawRect(x * 10, y * 10, 10, 10);
					}
				}
			}
			graphics.endFill();
		}

		private function onClick(e:MouseEvent):void {
			var endX:int=Math.floor(mouseX / 10);
			var endY:int=Math.floor(mouseY / 10);
			txt.text='开始点:[' + [startX, startY] + ']\t结束点:[' + [endX, endY] + ']';
			var oldTimer:int=getTimer();
			paths=aStar.findPath(startX, startY, endX, endY);
			if (paths) {
				if (paths.length < 1) {
					txt.appendText('\t\t开始点 或 结束点 isBlock.');
				} else {
					txt.appendText('\t\t寻路时间：' + ((getTimer() - oldTimer)) + 'ms, \tSteps:' + paths.length);
					startX=endX, startY=endY;
					drawMap();
				}
			} else {
				txt.appendText('\t\t寻路超时：' + (getTimer() - oldTimer))
			}
		}

		private function onFrame(e:Event):void {
			if (paths && paths.length > 0) {
				var target:Node=paths.pop();
				box.x=target.no_X * 10;
				box.y=target.no_Y * 10;
				addChild(box);
			}
		}
	}
}