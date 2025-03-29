let MapConfig = {
  rows: 120,
  cols: 60,
  tileWidth: 64,
  tileHeight: 32,
  mapWidth: 2880,
  mapHeight: 1440,
  grid: null
}

let PlayerConfig = {
  initRow: 42,
  initCol: 14
}

let SceneConfig = {
  initRow: 28,
  initCol: 10
}

class Game extends PIXI.Application {

  constructor(config) {
    super(config)
    this.init()
  }

  init() {
    document.body.prepend(this.view)

    var loader = new PIXI.Loader()
    loader.add({
      name: 'key',
      url: './assets/grid.json'
    }, function (res) {
      MapConfig.grid = res.data
    })
    loader.add('spritesheet', './assets/mc.json')
    loader.add([
      './assets/s1/s1_min.jpg',
      './assets/building.png',
      './assets/A_bianlidian1_4x4_85.28.png',
      './assets/controller.json'
    ])
    loader.once('complete', this.onLoadComplete.bind(this))
    loader.load()
  }

  onLoadComplete() {
    let minScale = Math.max(stageWidth / mapWidth, stageHeight / mapHeight)
    let maxScale = 2
    let initZoomValue = 1

    let scene = new Scene()
    this.stage.addChild(scene)
    scene.scale.set(initZoomValue)
    // scene.x = (stageWidth - mapWidth * initZoomValue) / 2
    // scene.y = (stageHeight - mapHeight * initZoomValue) / 2
    let {x, y} = scene.tiledMap.grid2xy(SceneConfig.initRow, SceneConfig.initCol)
    scene.x = -(x * initZoomValue)
    scene.y = -(y * initZoomValue)
    console.log(scene.x, scene.y)

    let bar = new ControlBar({
      ratio: scene.scale.x,
      minScale,
      maxScale,
      update(val) {
        let previousValue = zoom.value
        zoom.value = val
        zoom.calculatePosition(previousValue, zoom.value, stageWidth / 2, stageHeight / 2)

        scroll.contentWidth = mapWidth * val
        scroll.contentHeight = mapHeight * val
      }
    })
    this.stage.addChild(bar)
    bar.x = stageWidth - 120
    bar.y = 10

    let drag = new Drag({
      ele: scene,
      width: mapWidth,
      height: mapHeight
    })

    let zoom = new Zoom({
      ele: scene,
      value: initZoomValue,
      minZoom: minScale,
      maxZoom: maxScale,
      update(val) {
        bar.ratio = val

        scroll.contentWidth = mapWidth * val
        scroll.contentHeight = mapHeight * val
      }
    })

    let scroll = new Scroll({
      content: scene,
      maskWidth: stageWidth,
      maskHeight: stageHeight,
      contentWidth: mapWidth * initZoomValue,
      contentHeight: mapHeight * initZoomValue
    })
  }
}

class Scene extends PIXI.Container {
  constructor() {
    super()
    this.init()
  }

  init() {
    let tiledMap = this.tiledMap = new StaggeredTiledMap()

    let start = null
    let tiledMapLayer = new StaggeredTiledMapLayer(tiledMap)
    this.addChild(tiledMapLayer)
    tiledMapLayer.load()
    tiledMapLayer.drawGrid()
    tiledMapLayer.interactive = true
    tiledMapLayer.on('pointerdown', (event) => {
      start = {x: event.data.global.x, y: event.data.global.y}
    })

    tiledMapLayer.on("pointerup", (event) => {
      if (start) {
        let {x: x1, y: y1} = start
        let {x: x2, y: y2} = {x: event.data.global.x, y: event.data.global.y}
        let distance = Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1))
        // console.log(x1, y1, x2, y2, 'distance:', distance)
        if (distance < 1) { // 认为是点击事件
          let {x, y} = event.data.getLocalPosition(tiledMapLayer.parent)
          let {row, column} = tiledMap.xy2grid(x, y)
          // console.log('寻路:', x, y, row, column)
          this.pathArr = astar.findPath(this.current[0], this.current[1], row, column)
          if (this.pathArr) {
            this.pathArr.length && this.pathArr.pop()
            this.move()
          }
        }
      }
      start = null
    })

    let {x: x1, y: y1} = tiledMap.grid2xy(17, 19)
    let target = new PIXI.Sprite.from('./assets/A_bianlidian1_4x4_85.28.png')
    this.addChild(target)
    target.anchor.set(0.5)
    target.x = x1
    target.y = y1

    this.current = [PlayerConfig.initRow, PlayerConfig.initCol, '']
    let {x, y} = tiledMap.grid2xy(this.current[0], this.current[1])
    let player = this.player = new Player()
    player.x = x + tiledMap.tileWidth / 2
    player.y = y + tiledMap.tileHeight / 2
    this.addChild(player)

    // 控制框
    let controller = new Controller({
      scene: this,
      target
    })
    this.addChild(controller)

    let astar = new AStar()
    astar.outFilter = (node) => {
      if (!tiledMap.canWalk(node.row, node.col))
        return true

      if (node.d === 'left_up' || node.d === 'right_up' || node.d === 'left_down' || node.d === 'right_down') {
        let h_row1
        let h_col1
        let v_row2
        let v_col2

        //  检测两点之间是否有障碍,如果有则不能斜着走,反正则可以斜着走
        switch (node.d) {
          case "left_up":
            h_row1 = node.row + 1
            h_col1 = (node.row % 2 === 0 ? node.col : node.col + 1)

            v_row2 = node.row + 1
            v_col2 = (node.row % 2 === 0 ? node.col - 1 : node.col)
            break
          case "right_up":
            h_row1 = node.row - 1
            h_col1 = (node.row % 2 === 0 ? node.col - 1 : node.col)

            v_row2 = node.row + 1
            v_col2 = (node.row % 2 === 0 ? node.col - 1 : node.col)
            break
          case "left_down":
            h_row1 = node.row + 1
            h_col1 = (node.row % 2 === 0 ? node.col : node.col + 1)

            v_row2 = node.row - 1
            v_col2 = (node.row % 2 === 0 ? node.col : node.col + 1)
            break
          case "right_down":
            h_row1 = node.row - 1
            h_col1 = (node.row % 2 === 0 ? node.col - 1 : node.col)

            v_row2 = node.row - 1
            v_col2 = (node.row % 2 === 0 ? node.col : node.col + 1)
            break
        }

        if (!tiledMap.canWalk(h_row1, h_col1) || !tiledMap.canWalk(v_row2, v_col2))
          return true
      }

      return false
    }
  }

  move() {
    if (this.pathArr && this.pathArr.length > 0) {
      let current = this.current
      let next = this.pathArr.pop()
      let node = this.tiledMap.nodeList[next[0]][next[1]]
      let d = next[2]
      let duration = (d === 'up' || d === 'down' || d === 'left' || d === 'right'
        ? 0.3
        : d === 'left_down' || d === 'right_up'
          ? 0.5366726296958855
          : 0.26833631484794274)

      // console.log("current:", current)
      // console.log("next:", next)
      // console.log("d:", d)
      // console.log("duration:", duration)
      // console.log("\n")
      // Math.sqrt((50-0)*(50-0)+(25-0)*(25-0)) = 55.9 0.3s
      //                                          100  0.5366726296958855s
      //                                          50   0.26833631484794274s

      // console.log('方向比较:', d, this.player.direction)
      if (d !== this.player.direction)
        this.player.play(d)

      window["TweenMax"].to(this.player, duration, {
        x: node.x + node.width / 2,
        y: node.y + node.height / 2,
        ease: window["Power0"].easeNone,
        onComplete: this.move.bind(this)
      })

      this.current = next
    } else {
      this.player.stop()
    }
  }
}

class ControlBar extends PIXI.Container {
  constructor(config) {
    super()
    this.$config = Object.assign({}, config)

    let minusButton = new PIXI.Sprite.from('minus.png')
    this.addChild(minusButton)
    minusButton.scale.set(0.5)
    minusButton.buttonMode = true
    minusButton.interactive = true
    minusButton.on('pointerdown', (event) => {
      this.ratio -= 0.1
      this.$config.update && this.$config.update(this._ratio)
      event.stopPropagation()
    })

    let text = new PIXI.Text('', {fontFamily: 'Arial', fontSize: 16, fill: 0xffffff, align: 'center'})
    text.anchor.set(0.5)
    this.addChild(text)
    text.x = 105 / 2
    text.y = 25 / 2
    this.text = text

    let plusButton = new PIXI.Sprite.from('plus.png')
    this.addChild(plusButton)
    plusButton.scale.set(0.5)
    plusButton.buttonMode = true
    plusButton.x = 80
    plusButton.interactive = true
    plusButton.on('pointerdown', (event) => {
      this.ratio += 0.1
      this.$config.update && this.$config.update(this._ratio)
      event.stopPropagation()
    })

    this.ratio = this.$config.ratio || 1
  }

  set ratio(ratio) {
    if (ratio <= this.$config.minScale) {
      ratio = this.$config.minScale
    } else if (ratio >= this.$config.maxScale) {
      ratio = this.$config.maxScale
    }

    this._ratio = ratio

    this.text.text = parseInt(this._ratio * 100) + '%'
  }

  get ratio() {
    return this._ratio
  }
}

class Drag {
  constructor(config) {
    let {ele} = this.config = config

    this.ele = ele
    this.ele.interactive = true
    this.ele.on('pointerdown', this.onDragStart, this)
  }

  onDragStart(event) {
    let {x: gx, y: gy} = event.data.global

    this.dragging = true
    this.offset = {x: this.ele.x - gx, y: this.ele.y - gy}

    this.ele.on('pointerup', this.onDragEnd, this)
    this.ele.on('pointerupoutside', this.onDragEnd, this)
    this.ele.on('pointermove', this.onDragMove, this)
  }

  onDragEnd() {
    this.dragging = false
    this.offset = null
    this.ele.off('pointerup', this.onDragEnd, this)
      .off('pointerupoutside', this.onDragEnd, this)
      .off('pointermove', this.onDragMove, this)
  }

  onDragMove(event) {
    if (this.dragging) {
      let {x: gx, y: gy} = event.data.global

      let x = gx + this.offset.x
      x = (x >= 0
        ? 0
        : x <= -(mapWidth * this.ele.scale.x - stageWidth)
          ? -(mapWidth * this.ele.scale.x - stageWidth)
          : x)

      let y = gy + this.offset.y
      y = (y >= 0
        ? 0
        : y <= -(mapHeight * this.ele.scale.y - stageHeight)
          ? -(mapHeight * this.ele.scale.y - stageHeight)
          : y)

      this.ele.x = x
      this.ele.y = y
    }
  }
}

class Zoom {

  static defaultConfig = {
    x: 0,
    y: 0,
    value: 1,
    speed: 0.2,
    minScale: 0.5,
    maxScale: 2,
  }

  constructor(config) {
    let {ele, value} = this.$config = Object.assign({}, Zoom.defaultConfig, config)

    this.ele = ele
    this.value = value

    this.onMouseWheel = this.onMouseWheel.bind(this)
    document.addEventListener('mousewheel', this.onMouseWheel, {passive: false})
  }

  onMouseWheel(event) {
    this.zoom(event)
    event.preventDefault()
  }

  zoom(e) {
    let {speed, minZoom, maxZoom} = this.$config

    // 当前缩放值
    let currentZoom = this.value
    // 目标缩放值
    let targetZoom = e.wheelDelta <= 0
      ? currentZoom - speed
      : currentZoom + speed

    if (targetZoom >= maxZoom) {
      targetZoom = maxZoom
    } else if (targetZoom <= minZoom) {
      targetZoom = minZoom
    }

    this.value = targetZoom

    this.$config.update && this.$config.update(this.value)

    this.calculatePosition(currentZoom, targetZoom, e.clientX, e.clientY)
  }

  /**
   * 计算缩放后的坐标
   *
   * @param currentZoom 当前缩放值
   * @param targetZoom 目标缩放值
   * @param mouseX 鼠标点x坐标
   * @param mouseY 鼠标点y坐标
   * */
  calculatePosition(currentZoom, targetZoom, mouseX, mouseY) {
    // 计算缩放比例
    let rate = targetZoom / currentZoom

    // 先计算相对于图片中心点缩放后的坐标
    this.x *= rate
    this.y *= rate

    // 再计算鼠标点在图片中的偏移量(放大图片偏移量是正的，图片缩小偏移量是负的)，然后图片坐标减去偏移量
    this.x -= (rate - 1) * mouseX
    this.y -= (rate - 1) * mouseY

    // this.x = (this.x * rate) - (rate - 1) * mouseX
    // this.y = (this.y * rate) - (rate - 1) * mouseY
  }

  set value(val) {
    val = val > this.$config.maxZoom
      ? this.$config.maxZoom
      : val < this.$config.minZoom
        ? this.$config.minZoom
        : val

    this.ele.scale.set(val)
  }

  get value() {
    return this.ele.scale.x
  }

  set x(x) {
    x = (x >= 0
      ? 0
      : x <= -(mapWidth * this.value - stageWidth)
        ? -(mapWidth * this.value - stageWidth)
        : x)

    this.ele.x = x
  }

  get x() {
    return this.ele.x
  }

  set y(y) {
    y = (y >= 0
      ? 0
      : y <= -(mapHeight * this.value - stageHeight)
        ? -(mapHeight * this.value - stageHeight)
        : y)

    this.ele.y = y
  }

  get y() {
    return this.ele.y
  }

  destroy() {
    document.removeEventListener('mousewheel', this.onMouseWheel)
  }
}

class Scroll {
  constructor(option) {
    let {content, maskWidth, maskHeight, contentWidth, contentHeight} = this._options = option

    this._content = content
    this._maskWidth = maskWidth
    this._maskHeight = maskHeight
    this._contentWidth = contentWidth
    this._contentHeight = contentHeight
    this._deceleration = 0.001 // 0.004 0.0006

    this._content.on('pointerdown', this.onPointerDownListener, this)
  }

  onPointerDownListener() {
    let tw = window["TweenMax"].getTweensOf(this._content)
    tw.length && tw[0].kill()

    this._start = {
      time: new Date().getTime(),
      x: this._content.x,
      y: this._content.y
    }

    this._content.on("pointerup", this.onPointerUpListener, this)
    this._content.on("pointerout", this.onPointerOutListener, this)
  }

  onPointerUpListener() {
    if (this._start) {
      let duration = new Date().getTime() - this._start.time
      let momentumX = this.momentum(this._content.x, this._start.x, duration, this.maxScrollLeft, 0, this._deceleration)
      let momentumY = this.momentum(this._content.y, this._start.y, duration, this.maxScrollTop, 0, this._deceleration)
      let newX = momentumX.destination
      let newY = momentumY.destination
      let time = Math.max(momentumX.duration, momentumY.duration)
      // console.log('start xy:', this._startX, this._startY)
      // console.log('cur xy:', this.parentContainer.x, this.parentContainer.y)
      // console.log('end xy:', newX, newY)
      // console.log('time:', momentumX.duration, momentumY.duration, time)
      // console.log("newX:%d newY:%d", newX, newY)
      //
      let vars = {
        x: newX,
        y: newY,
        ease: window["Power2"].easeOut,
        onUpdate: () => {},
        onComplete: () => {}
      }
      window["TweenMax"].to(this._content, time / 1000, vars)
    }

    this._content.off("pointerup", this.onPointerUpListener, this)
    this._content.off("pointerout", this.onPointerOutListener, this)
  }

  onPointerOutListener(event) {
    this.onPointerUpListener(event)
  }

  /**
   * 动量计算函数
   *
   * @param current 当前位置
   * @param start 初始位置
   * @param time 初始位置到当前位置运动时间（毫秒）
   * @param lowerMargin 最大目的地点
   * @param wrapperSize
   * @param deceleration 滚动动量，就是负的加速度（减速越大越快，建议不大）
   *
   * @return {destination:number,duration:number}
   * */
  momentum(current, start, time, lowerMargin, wrapperSize, deceleration = 0.0006) {
    // console.log(current, start, time, lowerMargin, wrapperSize, deceleration)
    // 计算拖动的距离 = 当前位置 - 初始位置
    let distance = current - start
    // 计算拖动的速度 = (移动距离/时间)
    let speed = Math.abs(distance) / time
    // 记录终点位置
    let destination
    // 记录到终点位置应持续时间
    let duration
    // V1是初速度
    // V2是末速度
    // a是加速度
    // t为时间
    // x是位移距离
    let v1 = speed
    let v2 = 0
    let a = deceleration
    let t
    let x

    // 计算在给定加速度情况下，由初速度减至0所运动的距离，即v*(0-v)/deceleration
    // v2=v1+at
    // x=v1t+(1/2)at^2
    t = (v2 - v1) / a
    x = (v1 * t) + ((1 / 2) * a * t * t)

    destination = current + x * (distance > 0 ? -1 : 1)
    duration = speed / deceleration

    if (destination < lowerMargin) {
      destination = wrapperSize ? lowerMargin - (wrapperSize / 2.5 * (speed / 8)) : lowerMargin
      distance = Math.abs(destination - current)
      duration = distance / speed
    } else if (destination > 0) {
      destination = wrapperSize ? wrapperSize / 2.5 * (speed / 8) : 0
      distance = Math.abs(current) + destination
      duration = distance / speed
    }

    return {
      destination: Math.round(destination),
      duration: duration
    }
  }

  set contentWidth(val) {
    this._contentWidth = val
  }

  set contentHeight(val) {
    this._contentHeight = val
  }

  // 最大滚动距离 横向
  get maxScrollLeft() {
    return this._maskWidth - this._contentWidth
  }

  // 最大滚动距离 纵向
  get maxScrollTop() {
    return this._maskHeight - this._contentHeight
  }
}

class Controller extends PIXI.Container {

  static defaultConfig = {
    drag: true,
    zoom: true,
    rotate: true,
    transH: true,
    transV: true,
    close: true,
  }

  constructor(config) {
    super()

    let ctrlBox = this.ctrlBox = new PIXI.Container()

    let dragBtn = this.dragBtn = new PIXI.Sprite.from('drag.png')
    this.dragBtn.anchor.set(0.5)

    let zoomBtn = this.zoomBtn = new PIXI.Sprite.from('zoom.png')
    zoomBtn.anchor.set(0.5)
    zoomBtn.interactive = true

    let rotateBtn = this.rotateBtn = new PIXI.Sprite.from('rotate.png')
    rotateBtn.anchor.set(0.5)
    rotateBtn.interactive = true

    let translateBtnV = this.translateBtnV = new PIXI.Sprite.from('translate.png')
    translateBtnV.anchor.set(0.5)
    translateBtnV.interactive = true

    let translateBtnH = this.translateBtnH = new PIXI.Sprite.from('translate.png')
    translateBtnH.anchor.set(0.5)
    translateBtnH.interactive = true

    let closeBtn = this.closeBtn = new PIXI.Sprite.from('close.png')
    closeBtn.anchor.set(0.5)
    closeBtn.interactive = true

    let kuang = this.kuang = new PIXI.Graphics()
    kuang.interactive = true

    kuang.on('pointerdown', this.onDragStart.bind(this))
      .on('pointermove', this.onDragMove.bind(this))
      .on('pointerup', this.onDragEnd.bind(this))
      .on('pointerupoutside', this.onDragEnd.bind(this))

    zoomBtn.on('pointerdown', this.onZoomStart.bind(this))
      .on('pointermove', this.onZoomMove.bind(this))
      .on('pointerup', this.onZoomEnd.bind(this))
      .on('pointerupoutside', this.onZoomEnd.bind(this))

    rotateBtn.on('pointerdown', this.onRotateStart.bind(this))
      .on('pointermove', this.onRotateMove.bind(this))
      .on('pointerup', this.onRotateEnd.bind(this))
      .on('pointerupoutside', this.onRotateEnd.bind(this))


    translateBtnV.on('pointerdown', this.onTranslateVStart.bind(this))
      .on('pointermove', this.onTranslateVMove.bind(this))
      .on('pointerup', this.onTranslateVEnd.bind(this))
      .on('pointerupoutside', this.onTranslateVEnd.bind(this))

    translateBtnH.on('pointerdown', this.onTranslateHStart.bind(this))
      .on('pointermove', this.onTranslateHMove.bind(this))
      .on('pointerup', this.onTranslateHEnd.bind(this))
      .on('pointerupoutside', this.onTranslateHEnd.bind(this))


    let {target} = this.$config = Object.assign({}, Controller.defaultConfig, config)
    this.target = target

    this.start()
  }

  start() {
    let obj = this.$config
    let targetMc = obj.target
    let isDrag = obj.drag
    let isZoom = obj.zoom
    let isRotate = obj.rotate
    let isTransH = obj.transH
    let isTransV = obj.transV
    let isCloseBtn = obj.close

    let self = this
    let kuang = this.kuang
    let ctrlBox = this.ctrlBox
    let zoomBtn = this.zoomBtn
    let dragBtn = this.dragBtn
    let rotateBtn = this.rotateBtn
    let translateBtnV = this.translateBtnV
    let translateBtnH = this.translateBtnH
    let closeBtn = this.closeBtn

    if (targetMc.anchor) {
      if (targetMc.anchor.x != 0.5 || targetMc.anchor.y != 0.5) {
        var _x = targetMc.x
        var _y = targetMc.y
        targetMc.anchor.set(0.5)
        this._x = targetMc.x = _x + targetMc.width / 2
        this._x = targetMc.y = _y + targetMc.height / 2
      }
    }

    this.x = targetMc.x
    this.y = targetMc.y
    // self.rotation = targetMc.rotation;

    //添加外框
    kuang.lineStyle(2, kuangLineColor, 0.1)
    kuang.beginFill(0xFF700B, kuangAlpha)
    kuang.drawRect(-targetMc.width / 2, -targetMc.height / 2, targetMc.width, targetMc.height)
    self.addChild(kuang)

    //添加控制按钮容器
    self.addChild(ctrlBox)

    //添加拖动控制按钮
    if (isDrag) {
      ctrlBox.addChild(dragBtn)
      dragBtn.x = 0
      dragBtn.y = 0
    }

    //添加缩放按钮
    if (isZoom) {
      ctrlBox.addChild(zoomBtn)
      zoomBtn.x = -kuang.width / 2
      zoomBtn.y = -kuang.height / 2
    }

    //添加旋转按钮
    if (isRotate) {
      ctrlBox.addChild(rotateBtn)
      rotateBtn.x = kuang.width / 2
      rotateBtn.y = kuang.height / 2
    }

    // 添加垂直缩放按钮
    if (isTransV) {
      ctrlBox.addChild(translateBtnV)
      translateBtnV.x = 0
      translateBtnV.y = -kuang.height / 2
      translateBtnV.rotation = 90 * Math.PI / 180
    }

    // 添加横向缩放按钮
    if (isTransH) {
      ctrlBox.addChild(translateBtnH)
      translateBtnH.x = -kuang.width / 2
      translateBtnH.y = 0
    }

    this.showCtrl()
  }

  // 拖拽
  onDragStart(event) {
    event.stopPropagation()
    this.dragging = true
    this.hideCtrl()

    // this.x 是拖动对象相对于父级的x轴坐标
    // evt.clientX 是鼠标相对于浏览器可视区域的x坐标

    // 缩小地图后
    // 变化：地图容器的缩放比例
    // 不变：拖动对象坐标、鼠标坐标
    let evt = event.data.originalEvent
    this.offset = {x: this.x * this.zoom - evt.clientX, y: this.y * this.zoom - evt.clientY}
  }

  onDragMove(event) {
    if (this.dragging) {
      let evt = event.data.originalEvent
      // console.log()
      this.setX(evt.clientX + this.offset.x)
      this.setY(evt.clientY + this.offset.y)
      event.stopPropagation()
    }
  }

  onDragEnd(event) {
    this.dragging = false
    this.offset = null
    this.showCtrl()
    event.stopPropagation()
  }

  // 等比例缩放
  onZoomStart(event) {
    event.stopPropagation()
    this.zooming = true
    this.hideCtrl()
  }

  onZoomMove(event) {
    if (this.zooming) {
      let currentTarget = event.currentTarget
      var data = event.data
      // 当前鼠标点在指定 displayObject 的本地坐标
      var point = data.getLocalPosition(currentTarget.parent)
      let {width, height} = this.target.texture

      let scaleX = -point.x / (width / 2)
      let scaleY = -point.y / (height / 2)
      // console.log(scaleX, scaleY);

      this.target.scale.set(scaleX, scaleY)
      this.resetKuang()
      event.stopPropagation()
    }
  }

  onZoomEnd(event) {
    this.zooming = false
    this.showCtrl()
    event.stopPropagation()
  }

  // 旋转
  onRotateStart(event) {
    event.stopPropagation()
    this.rotating = true
    this.hideCtrl()
  }

  onRotateMove(event) {
    if (this.rotating) {
      let currentTarget = event.currentTarget
      let currentTargetRadian = Math.atan2(currentTarget.y, currentTarget.x)

      var data = event.data
      var p = data.getLocalPosition(this.parent)
      // Math.atan2(y,x) 返回从x轴到点 (x,y) 的角度
      var radian = Math.atan2((this.y - p.y), (this.x - p.x)) // 弧度

      radian -= currentTargetRadian
      radian -= 180 * (Math.PI / 180)

      this.rotation = this.target.rotation = radian

      event.stopPropagation()
    }
  }

  onRotateEnd(event) {
    event.stopPropagation()
    this.rotating = false
    this.showCtrl()
  }

  // 纵向缩放
  onTranslateVStart(event) {
    event.stopPropagation()
    this.scalingY = true
    this.hideCtrl()
  }

  onTranslateVMove(event) {
    if (this.scalingY) {
      let currentTarget = event.currentTarget
      let p = event.data.getLocalPosition(currentTarget.parent)
      let distance1 = p.y
      let distance2 = -this.target.texture.height / 2
      let scaleY = distance1 / distance2

      this.target.scale.y = scaleY
      this.resetKuang()
      event.stopPropagation()
    }
  }

  onTranslateVEnd(event) {
    event.stopPropagation()
    this.scalingY = false
    this.showCtrl()
  }

  // 横向缩放
  onTranslateHStart(event) {
    event.stopPropagation()
    this.scalingX = true
    this.hideCtrl()
  }

  onTranslateHMove(event) {
    if (this.scalingX) {
      let currentTarget = event.currentTarget
      let p = event.data.getLocalPosition(currentTarget.parent)
      let distance1 = p.x
      let distance2 = -this.target.texture.width / 2
      let scaleX = distance1 / distance2

      this.target.scale.x = scaleX
      this.resetKuang()
      event.stopPropagation()
    }
  }

  onTranslateHEnd(event) {
    event.stopPropagation()
    this.scalingX = false
    this.showCtrl()
  }

  hideCtrl() {
    this.ctrlBox.alpha = 0
  }

  showCtrl() {
    let ctrlBox = this.ctrlBox
    let zoomBtn = this.zoomBtn
    let rotateBtn = this.rotateBtn
    let translateBtnV = this.translateBtnV
    let translateBtnH = this.translateBtnH

    let {width, height} = this.target.texture
    let {x: sx, y: sy} = this.target.scale

    zoomBtn.x = -(sx * width / 2)
    zoomBtn.y = -(sy * height / 2)

    rotateBtn.x = sx * width / 2
    rotateBtn.y = -(sy * height / 2)

    translateBtnV.x = 0
    translateBtnV.y = -(sy * height / 2)

    translateBtnH.x = -(sx * width / 2)
    translateBtnH.y = 0

    ctrlBox.alpha = 1
  }

  resetKuang() {
    let kuang = this.kuang
    let targetMc = this.target
    kuang.clear()
    kuang.lineStyle(2, kuangLineColor, 1)
    kuang.beginFill(0xFF700B, kuangAlpha)
    kuang.drawRect(-targetMc.width / 2, -targetMc.height / 2, targetMc.width, targetMc.height)
  }

  setX(x) {
    x = x * (1 / this.zoom)

    this.x = x
    this.target.x = x
  }

  setY(y) {
    y = y * (1 / this.zoom)

    this.y = y
    this.target.y = y
  }

  get zoom() {
    return this.$config.scene.scale.x
  }
}

class StaggeredTiledMapLayer extends PIXI.Container {

  constructor(tiledMap) {
    super()

    this.tiledMap = tiledMap

    // 显示模糊小地图
    let smallMap = new PIXI.Sprite.from('./assets/s1/s1_min.jpg')
    this.addChild(smallMap)
    smallMap.scale.set(mapWidth / smallMap.texture.width, mapHeight / smallMap.texture.height)

    // 显示清晰大地图
    this._waitLoadZone = []
    this._sliceRows = 3 * 2
    this._sliceCols = 4 * 2
    this._sliceWidth = 720 / 2
    this._sliceHeight = 480 / 2

    for (let r = 0; r < this._sliceRows; r++) {
      for (let c = 0; c < this._sliceCols; c++) {
        let key = "s1_" + r + "_" + (c + 1) + ".png"
        this._waitLoadZone.push([key, r, c])
      }
    }
  }

  load() {
    // console.log("this._waitLoadZone.length: ", this._waitLoadZone.length)
    if (this._waitLoadZone.length) {
      let obj = this._waitLoadZone.shift()
      let key = obj[0]
      let row = obj[1]
      let col = obj[2]
      let url = "./assets/s1/360*240/" + key

      var loader = new PIXI.Loader()
      loader.add(url)

      loader.once('complete', () => {
        this.drawBGMap(url, row, col)
        this.load()
      })
      loader.load()
    }
  }

  drawBGMap(key, row, col) {
    let x = (this._sliceWidth * col)
    let y = (this._sliceHeight * row)

    let tileMap = new PIXI.Sprite.from(key)
    this.addChildAt(tileMap, 1)
    tileMap.position.set(x, y)
  }

  drawGrid() {
    // console.log(this.tiledMap.nodeList)

    /*for (var i = 0; i < this.tiledMap.nodeList.length; i++) {
      let arr = this.tiledMap.nodeList[i]
      for (var j = 0; j < arr.length; j++) {
        let node = arr[j]
        queue.push(node)
      }
    }*/

    /*for (var i = 25; i < 70; i++) {
      let arr = this.tiledMap.nodeList[i]
      for (var j = 6; j < 20; j++) {
        let node = arr[j]
        // queue.push(node)

        let rhombusView = new MapNodeView(node)
        this.addChild(rhombusView)
        rhombusView.x = node.x
        rhombusView.y = node.y
      }
    }*/
    for (var i = 0; i < 70; i++) {
      let arr = this.tiledMap.nodeList[i]
      for (var j = 0; j < 20; j++) {
        let node = arr[j]
        // queue.push(node)

        let rhombusView = new MapNodeView(node)
        this.addChild(rhombusView)
        rhombusView.x = node.x
        rhombusView.y = node.y
      }
    }

    let queue = []
    // console.log(queue, queue.length)

    /*let m = 0
    let length = queue.length
    let _this = this

    function render() {
      setTimeout(() => {
        let node = queue.shift()
        let rhombusView = new MapNodeView(node)
        _this.addChild(rhombusView)
        rhombusView.x = node.x
        rhombusView.y = node.y

        if (++m < length) {
          render()
        }
      }, 0)
    }

    render()*/
  }
}

class StaggeredTiledMap {

  constructor() {
    let {rows, cols, tileWidth, tileHeight, mapWidth, mapHeight, grid} = MapConfig

    this.rows = rows
    this.cols = cols
    this.tileWidth = tileWidth
    this.tileHeight = tileHeight
    this.mapWidth = tileHeight
    this.mapHeight = mapHeight
    this.nodeList = []

    for (var row = 0; row < rows; row++) {
      let arr = []
      for (var col = 0; col < cols; col++) {
        let {x, y} = this.grid2xy(row, col)
        let node = new MapNode({
          x,
          y,
          row,
          col,
          width: tileWidth,
          height: tileHeight,
          state: grid[row][col]
        })
        arr.push(node)
      }
      this.nodeList.push(arr)
    }
  }

  /**
   * 格子坐标转换到坐标点
   * @param row 行
   * @param column 列
   * */
  grid2xy(row, column) {
    // console.log('row:%d,column:%d', row, column)
    if (this.checkRowColumn(row, column)) {
      return {
        x: (column * this.tileWidth) + (row & 1) * (this.tileWidth / 2),
        y: row * (this.tileHeight / 2)
      }
    }
    return null
  }

  /**
   * 坐标点转换到格子坐标
   * @param px 相对于地图左上角(0,0)点的x坐标
   * @param py 相对于地图左上角(0,0)点的y坐标
   * */
  xy2grid(px, py) {
    // console.log(px, py)
    let {tileWidth, tileHeight} = this

    var xtile = 0 // 网格的x坐标
    var ytile = 0 // 网格的y坐标

    var cx, cy, rx, ry

    // 计算出当前X所在的以tileWidth为宽的矩形的中心的X坐标
    cx = parseInt(String(px / tileWidth)) * tileWidth + tileWidth / 2
    // 计算出当前Y所在的以tileHeight为高的矩形的中心的Y坐标
    cy = parseInt(String(py / tileHeight)) * tileHeight + tileHeight / 2

    rx = (px - cx) * tileHeight / 2
    // console.log('纵向矩形面积 long:%f, wide:%f,rx:%f', (px - cx), tileHeight / 2, rx)
    ry = (py - cy) * tileWidth / 2
    // console.log('横向矩形面积 long:%f, wide:%f,ry:%f', tileWidth / 2, (py - cy), ry)

    // 当前点击面积，1/4矩形面积
    if (Math.abs(rx) + Math.abs(ry) <= tileWidth * tileHeight / 4) {// 在菱形区域内
      // xtile = int(pixelPoint.x / tileWidth) * 2;
      xtile = parseInt(String(px / tileWidth))
      ytile = parseInt(String(py / tileHeight)) * 2
    } else { // 不在菱形区域内
      px = px - tileWidth / 2
      // xtile = int(pixelPoint.x / tileWidth) * 2 + 1;
      xtile = parseInt(String(px / tileWidth)) + 1

      py = py - tileHeight / 2
      ytile = parseInt(String(py / tileHeight)) * 2 + 1
    }
    return {
      row: ytile,
      column: xtile - (ytile & 1)
    }
  }

  /**
   * 检测行,列是否在地图范围内
   * */
  checkRowColumn(row, column) {
    if (row < 0 || row > this.rows - 1) {
      console.info(`${row}行不在地图范围内`)
      return false
    } else if (column < 0 || column > this.cols - 1) {
      console.info(`${column}列不在地图范围内`)
      return false
    }
    return true
  }

  /**
   * 检测row，col对应的格子是否可行走
   * */
  canWalk(row, col) {
    if (!this.checkRowColumn(row, col))
      return false

    return this.nodeList[row][col].state === 1
  }
}

class MapNode {
  constructor(data) {
    let {row, col, x, y, state = 0, width, height} = data
    this.data = data
    this.row = row
    this.col = col
    this.x = x
    this.y = y
    this.width = width
    this.height = height
    this.state = state
  }
}

class MapNodeView extends PIXI.Container {
  constructor(node) {
    super()

    this.node = node
    let w = node.width
    let h = node.height
    let row = node.row
    let col = node.col

    var graphics = new PIXI.Graphics()
    graphics.beginFill(node.state ? 0x000000 : 0xFF0000, node.state ? 0.3 : 0.5)
    graphics.lineStyle(1, 0xffffff, 0.3)
    graphics.moveTo(0, h / 2)
    graphics.lineTo(w / 2, 0)
    graphics.lineTo(w, h / 2)
    graphics.lineTo(w / 2, h)
    graphics.closePath()
    graphics.endFill()
    this.addChild(graphics)

    let text = new PIXI.Text(`${row}/${col}`, {fontFamily: 'Arial', fontSize: 10, fill: 0xffffff, align: 'center'})
    text.anchor.set(0.5)
    this.addChild(text)
    text.alpha = 0.5
    text.x = w / 2
    text.y = h / 2
  }
}

class Player extends PIXI.Container {
  constructor() {
    super()

    let explosionTextures = [PIXI.Texture.from(`Explosion_Sequence_A 1.png`)]
    for (let i = 1; i <= 64; i++) {
      const texture = PIXI.Texture.from(`Explosion_Sequence_A ${i}.png`)
      explosionTextures.push(texture)
    }
    explosionTextures.push(PIXI.Texture.from(`Explosion_Sequence_A 64.png`))

    let player = this.player = new PIXI.AnimatedSprite(explosionTextures)
    player.onFrameChange = function () {
      let currentFrame = player.currentFrame
      // 注意：currentFrame 从0开始的
      // console.log("currentFrame:", currentFrame)
      if (currentFrame % 8 === 0) {
        let frame = (currentFrame - 8) + 1
        // console.log("循环播放:", frame)
        player.gotoAndPlay(frame)
      }
    }
    player.x = 0
    player.y = 0
    player.anchor.set(0.5, 0.65625)
    player.gotoAndStop(49)
    player.animationSpeed = 0.2
    // player.animationSpeed = 0.1
    this.addChild(player)

    this.direction = ''
    this.directions = {
      'left': 2,
      'left_up': 3,
      'up': 4,
      'right_up': 5,
      'right': 6,
      'right_down': 7,
      'down': 8,
      'left_down': 1,
    }

    /*const graphics = new PIXI.Graphics()
    graphics.beginFill(0xDE3249)
    graphics.drawRect(0, 0, 10, 10)
    graphics.endFill()
    this.addChild(graphics)*/
  }

  play(direction) {
    // console.log('direction:', direction)
    this.direction = direction
    let idx = this.directions[direction] - 1
    if (idx < 8) {
      let frame = ((idx) * 8) + 1
      // console.log("换方向:", frame);
      this.player.gotoAndPlay(frame)
    }
  }

  stop() {
    let idx = this.directions[this.direction] - 1
    let frame = ((idx) * 8) + 1
    // console.log('frame:', frame)
    this.player.gotoAndStop(frame)
    this.direction = ''
  }
}