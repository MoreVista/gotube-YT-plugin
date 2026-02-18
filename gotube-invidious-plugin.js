var Invidious = new Object();
Invidious.rev = 1;
Invidious.SearchDesc = "YouTube (via Invidious)";
Invidious.Name = "Invidious";

// 【重要】ここにHTTPで接続可能なInvidiousインスタンスのURLを入力してください。
// 末尾の「/」は入れないでください。
// PSPはHTTPS(TLS1.2以降)に対応していないため、HTTPでアクセスできるプロキシ等が必要です。
var INSTANCE_URL = "http://192.168.2.12:3000"; 

Invidious.Search = function (keyword, page) {
    var result = new Object();
    result.bypage = 20;
    result.start = (page - 1) * result.bypage + 1;
    
    // APIリクエストURLの作成
    // type=video に限定
    var apiUrl = INSTANCE_URL + '/api/v1/search?q=' + escape(keyword) + '&page=' + page + '&type=video';
    
    var jsonString = GetContents(apiUrl);
    
    // 結果の初期化
    result.VideoInfo = new Array();
    
    if (jsonString) {
        // 古いJSエンジン向けにevalでJSONをパースする
        var data;
        try {
            // 安全のため括弧でくくる
            data = eval('(' + jsonString + ')');
        } catch (e) {
            // パースエラー時は空の結果を返す
            result.end = 0;
            return result;
        }

        // Invidiousの検索APIは配列を返す
        if (data && data.length > 0) {
            for (var i = 0; i < data.length; i++) {
                var item = data[i];
                
                // typeがvideoのものだけ処理
                if (item.type !== 'video') continue;

                var v = { attr: 2 };
                v.id = item.videoId;
                v.Title = item.title;
                v.Description = "Author: " + item.author + "\n" + (item.description || "");
                v.LengthSeconds = item.lengthSeconds;
                v.ViewCount = item.viewCount;
                
                // サムネイル (高画質がない場合はhqdefaultへフォールバック)
                // PSPがhttps画像を読み込めない場合を考慮し、httpへ置換するか、プロキシ経由にする必要があります
                // ここでは単純にYoutubeのサーバーを指定（PSPによっては表示されない可能性あり）
                v.ThumbnailURL = 'http://i.ytimg.com/vi/' + v.id + '/hqdefault.jpg';
                
                v.SaveFilename = v.id + ".mp4";
                
                // 再生用関数の呼び出し設定
                v.URL = 'Invidious.play("' + v.id + '")';
                
                result.VideoInfo.push(v);
            }
        }
    }

    // ページネーション用
    result.end = result.start - 1 + result.VideoInfo.length;
    // Invidious APIはトータル件数を簡単に返さない場合があるため、
    // 次のページがあるかどうかの判定用に、取得できた数が0より大きければ多めの数をセットしておく
    if (result.VideoInfo.length > 0) {
        result.total = result.start + 100; 
    } else {
        result.total = result.start;
    }

    return result;
};

Invidious.play = function (id) {
    var videoUrl = "";
    var apiUrl = INSTANCE_URL + "/api/v1/videos/" + id;
    
    var jsonString = GetContents(apiUrl);
    
    if (jsonString) {
        var data;
        try {
            data = eval('(' + jsonString + ')');
        } catch (e) {
            return "";
        }

        if (data && data.formatStreams) {
            var streams = data.formatStreams;
            
            // PSPに適したストリームを探す (MP4 コンテナ, 解像度360p付近)
            for (var i = 0; i < streams.length; i++) {
                var s = streams[i];
                var container = s.container || "";
                var resolution = s.resolution || "";

                // MP4を探す
                if (container.toLowerCase().indexOf("mp4") !== -1) {
                    // 360pが見つかればそれを優先してループを抜ける
                    if (resolution.indexOf("360p") !== -1) {
                        videoUrl = s.url;
                        break;
                    }
                    // 360p以外でもとりあえずMP4なら保持しておく（720pだとPSPで再生できない可能性あり）
                    if (videoUrl === "") {
                        videoUrl = s.url;
                    }
                }
            }
        }
    }
    
    return videoUrl;
};

// GoTubeに登録
SiteList.push(Invidious);