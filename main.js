enchant();

// androidでは、一定周期で動作が重くなる。（GC?メモリリーク？）

// ファイル名
var IMAGE = {
	"crow": "crow.png",
	"rook": "rook.png",
	"crown": "crown.png",
	"nums": "nums.png",
	"king1a": "king.png",
	"king1b": "king2.png",
	"king2a": "king3.png",
	"king2b": "king4.png",
	"king3": "king5.png",
};

var life = 3;
var allscore = 0;
var waittime = 300;
var touching = false;

var GROUND_Y = 280;

// main関数
window.onload = function  () {
	var game = new Game(320, 320);	
	game.fps = 24;	// どのくらいfpsだったら、操作してて気持ちよくて（違和感がなくて）、かつ処理落ちが起きないか
	for (key in IMAGE) {
		game.preload(IMAGE[key]);
	}
	game.onload = game_onload;
	//game.debug();
	game.start();
}

// enchant.js game開始時に呼ばれる関数
function game_onload() {
	var game = this;
	
	// 手抜き用関数
	function getRandomIntager(int_num) { // 0~(int_num-1)のランダムな整数値を返す
		return Math.floor(Math.random() * int_num);
	}
	
	function getPlaceOfNum(num) {
		//return (num + "").length;
		
		if (num === 0) {
			return 1;
		}
		
		return Math.floor(Math.log(num) / Math.LN10) + 1;
	}
	
	game.rootScene.backgroundColor = "rgb(128, 255, 255)"
	
	
	////////////////////////////////////////////////////
	// クラス
	////////////////////////////////////////////////////
	
	// TODO クラスの属性でyの配列を用意して座標を先に計算しておく？
	var Rook = enchant.Class.create(enchant.Sprite, 
	{
		initialize: function (x) {
			enchant.Sprite.call(this, 36, 44);
			this.image = game.assets[IMAGE["rook"]];
			this.moveTo(x, GROUND_Y - 44 + 1);
			
			this.vy = 0;
			this.jumping = false;
			
			this.addEventListener("enterframe", this.update);
			this.addEventListener("touchstart", this.ontouch);
		},
		ontouch: function(e) {
			if (this.jumping) {
				return;
			}
		
			this.vy = -20;
			this.jumping = true;
			touching = true;
		},
		update: function () {
			if (!this.jumping) {
				return;
			}
			
			this.vy += 1;
			this.y += this.vy;
			
			// 天井で減速・跳ね返り
			/*if (this.y < 0) {
				this.vy = 5;
			}*/
			
			// 段を入れ替わってもおもしろいかも
			
			if (this.y > GROUND_Y - this.height + 1) {	// 着地
				this.y = GROUND_Y - this.height + 1;
				this.vy = 0;
				this.jumping = false;
			}
		}
	}
	);
	
	var Crow = enchant.Class.create(enchant.Sprite, {
		initialize: function (y, rooks) {
			enchant.Sprite.call(this, 40, 32);
			this.image = game.assets[IMAGE["crow"]];
			this.moveTo(game.width + 40, y);
			
			this.rooks = rooks;
			this.dead = false;
			
			this.addEventListener("enterframe", this.update);
		},
		update: function () {
			this.x -= 2;
			
			this.checkIntersect();
			
			if (this.x < 0 - this.width) { // 左画面端に到達
				// ダメージ
				// アラートじゃなくちゃんと示す。今はイライラする。
				/*
				life--;
				
				
				if (life === 0) {
					alert("Game Over...");
					game.stop();	// なぜ呼び出せる？→構文スコープなので、入れ子の関数から外側の関数のローカル変数を参照できる
					return;
				}
				
				alert("damage!\nrest life: " + life);
				*/
				this.dead = true;
				//console.log("invade!");
			}
			if (this.dead) {
				this.parentNode.removeChild(this);
				//console.log("dead");
			}
		},
		checkIntersect: function () {
			var i;
			for (i = 0; i < rooks.length; i++) {
				var rook = rooks[i];
				
				// 範囲外なら飛ばす
				if (this.x > rook.x + rook.width) {
					return;
				}
				
				if (!rook.jumping || this.x + this.width < rook.x) {
					continue;
				}
				
				//if (rook.intersect(this)) { // こっちのが早い。TODO でも処理は増えているはずなのになぜ
				// 参考：enchant.js Entityクラス _intersectOneメソッド
				if (rook.y <= this.y + this.height && this.y <= rook.y + rook.height) {
					//console.log("intersect");
					this.dead = true;
					if (rook.vy >= 0) rook.vy = -20;
					drawScore(this.x, this.y, 200);
					addAllScore(200);
					return;
					//this.parent.removeChild(this);
				}
			};
		}
	});
	
	var GraphicScore = enchant.Class.create(Sprite, {
		initialize: function(score) {
			var isMinus = 0;
			var place;
			
			if (score < 0) {
				isMinus = 1;
				score = -score;
			}
			place = getPlaceOfNum(score) + isMinus;
			
			Sprite.call(this, place*7, 10);
			this.image = new Surface(place*7, 10);
			
			//this.image.draw(game.assets[IMAGE["nums"]]);
			
			for ( ; place > isMinus; place--) {
				var num = score % 10;
				this.image.draw(game.assets[IMAGE["nums"]], num*7, 0, 7, 10, (place-1)*7, 0, 7, 10);
				score = Math.floor(score / 10);
			}
			if (isMinus) {
				this.image.draw(game.assets[IMAGE["nums"]], 10*7, 0, 7, 10, 0, 0, 7, 10);
			}
			
		},
	});
	
	var EffectBG = enchant.Class.create(enchant.Sprite, {
		initialize: function (width, height) {
			enchant.Sprite.call(this, width, height);
			this.image = new Surface(width, height);
			this.ctx = this.image.context;
		},
	});
	var AllScoreSprite = enchant.Class.create(EffectBG, {
		initialize: function () {
			EffectBG.call(this, 320, 20);
		},
		drawScore: function (score) { // 右詰め
			var NUMWIDTH = 7;
			var NUMHEIGHT = 10;
			var scale = 2;
			var isMinus = 0;
			var x = this.width - scale*NUMWIDTH;
			
			
			if (score < 0) {
				isMinus = 1;
				score = -score;
			}
			
			// 描画
			do {
				var num = score % 10;
				this.image.context.clearRect(x, 0, scale*NUMWIDTH, scale*NUMHEIGHT);
				this.image.draw(game.assets[IMAGE["nums"]], num*NUMWIDTH, 0, NUMWIDTH, NUMHEIGHT, x, 0, scale*NUMWIDTH, scale*NUMHEIGHT);
				score = Math.floor(score / 10);
				x -= scale*NUMWIDTH;
			} while (score !== 0);
			if (isMinus) {
				this.image.draw(game.assets[IMAGE["nums"]], 10*NUMWIDTH, 0, NUMWIDTH, NUMHEIGHT, x, 0, scale*NUMWIDTH, scale*NUMHEIGHT);
			}
		}, 
		
	});
	
	var King = enchant.Class.create(enchant.Sprite, {
		initialize: function () {
			enchant.Sprite.call(this, 36, 44);
			this.expressions = {
				normal: game.assets[IMAGE["king1a"]],
				special: game.assets[IMAGE["king1b"]]
			}
			/*this.expressions2 = {
				normal: game.assets[IMAGE["king2a"]],
				special: game.assets[IMAGE["king2b"]]
			}*/
			// TODO モード変更。変更時はすぐに絵に反映されないといけない。
			this.image = this.expressions.normal;
			//this.wait = getRandomIntager(200) + 0;
			this.wait = 0;
			this.addEventListener("enterframe", this.update);
		},
		update: function() {
			//console.log(touching, this.wait);
			if (this.wait > 0) {
				this.wait--;
			} else {
				if (touching) {
					this.image = this.expressions.special;
					this.wait = 10;
					touching = false;
				} else if (this.image === this.expressions.special) {
					this.image = this.expressions.normal;
					this.wait = 0;//getRandomIntager(200);
				}
			}
		},
	});
	
	// カラスの略奪者
	var RaiderCrow = enchant.Class.create(enchant.Group, {
		initialize: function (x, y) {
			enchant.Group.call(this);
			// カラス作成
			this.crow = new Sprite(40, 32);
			this.crow.image = game.assets[IMAGE["crow"]];
			this.crow.scaleX = -1;
			this.crow.moveTo(x, y);
			this.addChild(this.crow);
			
			this.item = null;
			
			this.vy = 0;
			this.addEventListener("enterframe", this.update);
		},
		pickItem: function (sprite, x, y) {
			if (this.item !== null) {
				return;
			}
			this.item = sprite
			this.addChild(sprite);
			sprite.moveTo(x, y)
		},
		dropItem: function () {
			if (this.item === null) {
				return;
			}
			this.removeChild(this.item);
		},
		update: function () {	// カラスの羽ばたき
			
			if (this.x >= game.width - this.item.x 
			|| this.y < -this.item.y - this.item.height
			) {
				//console.log(this.x, this.y)
				this.parentNode.removeChild(this);
			}
			
			// 速度の更新（重いものをもったときの羽ばたき）
			if (this.vy < -1) {
				this.vy = 5;
				this.x += 2;
			} else {
				this.vy -= 1;
			}
			this.x += 1;
			this.y -= this.vy;
			
		}
	});
	var Crown = enchant.Class.create(enchant.Sprite, {
		initialize: function () {
			// Surfaceにヨコタテが入っているのでマジックナンバーなしで書けるけどめんどくさい
			var image = game.assets[IMAGE["crown"]]
			enchant.Sprite.call(this, image.width, image.height);
			this.image = image;
			this.pickX = -18;
			this.pickY = 19;
		}
	});
	
	///////////////////////////////////
	// ゲーム内オブジェクトを利用しない関数
	///////////////////////////////////
	
	var makeRaiderCrow = function (x, y, spriteID) {
		var SpriteClasses = [Crown];
		var sprite = new (SpriteClasses[spriteID])();
		var raiderCrow = new RaiderCrow(x, y);
		raiderCrow.pickItem(sprite, x + sprite.pickX, y + sprite.pickY);
		
		game.rootScene.addChild(raiderCrow);
	}
	
	var drawScore = function (x, y, score) {	// こうぶんすこーぷ？
		var sprite = new GraphicScore(score);
		game.rootScene.addChild(sprite);
		sprite.moveTo(x, y);
		sprite.scale(2);
		sprite.tl.moveBy(0, 0, 60).removeFromScene();
		// 表示の仕方はいろいろあるよねーうえーーー
	}
	
	/////////////////////////////
	// ゲーム内オブジェクトの作成
	/////////////////////////////
	var effectBG = new EffectBG(game.width, game.height);
	effectBG.ctx.fillStyle = "limegreen"
	effectBG.ctx.fillRect(0, GROUND_Y, this.width, game.height - GROUND_Y);
	//effectBG.moveTo(0, GROUND_Y);
	
	/*
	// http://code.9leap.net/codes/show/3682 からコピーして改変
	var grad  = effectBG.ctx.createLinearGradient(0,50, 0,200);
	//grad.addColorStop(0,'darkblue'); 
	grad.addColorStop(0,'gray'); 
	grad.addColorStop(1,"rgba(128, 255, 255, 0)"); 
        effectBG.ctx.fillStyle = grad; 
        
	//effectBG.ctx.fillStyle = "-webkit-linear-gradient(to bottom right, #FFFFFF 0%, #00A3EF 100%)";
	effectBG.ctx.fillRect(0, 0, this.width, 200);
	*/
	game.rootScene.addChild(effectBG);
	
	var king = new King();
	king.moveTo(20, GROUND_Y - 44 + 1);
	game.rootScene.addChild(king);
		
	var rook1 = new Rook(70)
	game.rootScene.addChild(rook1);
	var rook2 = new Rook(106)
	game.rootScene.addChild(rook2);
	var rook3 = new Rook(142)
	game.rootScene.addChild(rook3);
	
	//var crow = new Crow(200, rooks);
	//game.rootScene.addChild(crow);
	
	var allScoreSprite = new AllScoreSprite(320, 20);
	allScoreSprite.moveTo(0, 10);
	game.rootScene.addChild(allScoreSprite);
	allScoreSprite.drawScore(allscore);
	
	
	/////////////////////////////
	// ゲーム内オブジェクトを利用する関数
	/////////////////////////////
	var rooks = [rook3, rook2, rook1];
	// xの値が大きいほうが配列の先頭に来るように並べる。
	// crowのcheckIntersectでの処理のショートカットのため。
	var makeCrow = function (y) {
		game.rootScene.addChild(new Crow(y, rooks));
	};
	
	
	var addAllScore = function (score) {
		// 全体のスコアに反映
		allscore += score
		allScoreSprite.drawScore(allscore);
	}
	//makeCrow(100);
	
	// TODO 使いまわしが必要？
	// BALANCE 理不尽でない・やることがなくならないよう
	
	game.rootScene.wait = 0;
	game.rootScene.addEventListener("enterframe", function () {
		this.wait -= getRandomIntager(10);
		if (this.wait < 0) {
			makeCrow(getRandomIntager(60) + 60);
			this.wait = waittime;
			
			if (waittime > 60 && getRandomIntager(2) === 0) {
				waittime -= 2;
			}
			if (waittime < 80 && getRandomIntager(40) === 0) {
				waittime += 20;
			}
		}
	});
	
	///////////test area///////////
	drawScore(100, 100, -244);
	
	makeRaiderCrow(0, 200, 0);
	
	///////////test area///////////
	
}
