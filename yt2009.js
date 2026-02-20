var YT2009 = new Object();
YT2009.rev = 2;
YT2009.SearchDesc = "YT2009 (Robust)";
YT2009.Name = "YT2009";

// 【重要】ここにYT2009インスタンスのURLを入力してください
// 末尾の「/」は入れないでください
// 例: "http://192.168.1.10:80" (必ず http で指定)
var INSTANCE_URL = "http://192.168.2.12:8080"; 

// 独自抽出関数：GoTubeのext()に依存せず、確実にタグの中身を抜く
function my_extract(str, startTag, endTag) {
    var s = str.indexOf(startTag);
    if (s == -1) return "";
    s += startTag.length;
    var e = str.indexOf(endTag, s);
    if (e == -1) return "";
    return str.substring(s, e);
}

YT2009.Search = function (keyword, page) {
    var result = new Object();
    result.bypage = 20;
    result.start = (page - 1) * result.bypage + 1;
    var sortBy = "relevance";

    // 検索オプション (@で日付順)
    if (keyword.charAt(0) == '@') {
        sortBy = "published";
        keyword = keyword.substring(1);
    }

    // デバッグ用: "debug" で検索すると通信テストを行う
    if (keyword == "debug") {
        result.VideoInfo = new Array();
        var v = { attr: 2, id: "debug" };
        v.Title = "Config: " + INSTANCE_URL;
        
        // 接続テスト
        var testData = GetContents(INSTANCE_URL + "/feeds/api/videos?q=test&max-results=1&v=2");
        if (testData) {
             v.Description = "Connection OK.\nData Len: " + testData.length;
             v.URL = "";
        } else {
             v.Description = "Connection FAILED.\nCheck IP/Port.";
             v.URL = "";
        }
        result.VideoInfo.push(v);
        result.end = 1;
        return result;
    }

    // APIリクエスト (GData v2形式)
    var apiUrl = INSTANCE_URL + '/feeds/api/videos?q=' + escape(keyword) + 
                 '&start-index=' + result.start + 
                 '&max-results=' + result.bypage + 
                 '&orderby=' + sortBy + 
                 '&racy=include&v=2&alt=xml'; // alt=xmlを明示

    var xml = GetContents(apiUrl);
    result.VideoInfo = new Array();
    
    if (xml) {
        // <entry> タグでXMLを分割して配列にする（これが最も確実）
        // 最初の要素[0]はヘッダーなので無視し、[1]以降が動画データ
        var entries = xml.split("<entry>");
        
        // トータル件数の取得（ヘッダー部分から）
        var totalStr = my_extract(entries[0], "totalResults>", "<");
        result.total = parseInt(totalStr);
        if (isNaN(result.total)) result.total = 0;

        // 各動画データを処理
        for (var i = 1; i < entries.length; i++) {
            var entry = entries[i];
            var v = { attr: 2 };

            // ID抽出
            // YT2009は <id>http://IP/feeds/api/videos/VIDEO_ID</id> を返す
            var fullId = my_extract(entry, "<id>", "</id>");
            var lastSlash = fullId.lastIndexOf("/");
            if (lastSlash != -1) {
                v.id = fullId.substring(lastSlash + 1);
            } else {
                v.id = fullId;
            }

            // タイトル
            v.Title = my_extract(entry, "<title type='text'>", "</title>");
            
            // 説明文と投稿者
            var desc = my_extract(entry, "<content type='text'>", "</content>");
            var author = my_extract(entry, "<name>", "</name>");
            v.Description = desc + "\nUploader: " + author;

            // 数値データ
            v.ViewCount = parseInt(my_extract(entry, "viewCount='", "'"));
            v.LengthSeconds = parseInt(my_extract(entry, "duration='", "'"));
            
            // サムネイル (YouTubeのサーバーを直接参照して負荷軽減)
            v.ThumbnailURL = 'http://i.ytimg.com/vi/' + v.id + '/default.jpg';
            
            v.SaveFilename = v.id + ".mp4";
            v.URL = 'YT2009.play("' + v.id + '")';
            
            result.VideoInfo.push(v);
        }
    }

    result.end = result.start - 1 + result.VideoInfo.length;
    // 検索結果が空の場合の安全策
    if (result.VideoInfo.length == 0 && result.total > 0) {
        result.end = 0;
    }
    
    return result;
};

YT2009.play = function (id) {
    // get_video_info APIを使用してストリーム情報を取得
    var infoUrl = INSTANCE_URL + "/get_video_info?video_id=" + id;
    var data = GetContents(infoUrl);
    var videoUrl = "";

    if (data) {
        // url_encoded_fmt_stream_mapを探す
        // key=value形式のレスポンス
        var mapKey = "url_encoded_fmt_stream_map=";
        var start = data.indexOf(mapKey);
        
        if (start != -1) {
            var mapData = data.substring(start + mapKey.length);
            // 次のパラメータがあればそこで切る
            var end = mapData.indexOf("&");
            if (end != -1) mapData = mapData.substring(0, end);
            
            // URLデコード
            mapData = unescape(mapData);
            
            // ストリームはカンマ区切り
            var streams = mapData.split(",");
            
            for (var i = 0; i < streams.length; i++) {
                var stream = streams[i];
                
                // itag=18 (360p MP4) を優先的に探す
                if (stream.indexOf("itag=18") != -1) {
                    // url=... を探す
                    // ストリーム文字列自体もクエリ形式なので分解する
                    var params = stream.split("&");
                    for (var j = 0; j < params.length; j++) {
                        var p = params[j];
                        if (p.indexOf("url=") == 0) {
                            videoUrl = p.substring(4); // url= の後ろ
                            videoUrl = unescape(videoUrl); // 再度デコード
                            break;
                        }
                    }
                    if (videoUrl != "") break;
                }
            }
        }
    }

    // URLが見つかった場合の処理
    if (videoUrl != "") {
        // HTTPS -> HTTP (PSP対応)
        if (videoUrl.indexOf("https://") == 0) {
            videoUrl = "http://" + videoUrl.substring(8);
        }
        
        // 相対パスの場合はインスタンスURLを補完 (YT2009の設定による)
        if (videoUrl.charAt(0) == '/') {
            videoUrl = INSTANCE_URL + videoUrl;
        }

        // 拡張子偽装
        videoUrl = videoUrl + "&ext=.mp4";
    }

    return videoUrl;
};

SiteList.push(YT2009);