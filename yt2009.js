var YT2009 = new Object();
YT2009.rev = 6;
YT2009.SearchDesc = "YT2009 (FLV Mode)";
YT2009.Name = "YT2009";

// 【重要】YT2009インスタンスのURL (末尾の「/」はなし)
var INSTANCE_URL = "http://192.168.2.12:8080"; 

// ヘルパー関数
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
    if (keyword.charAt(0) == '@') {
        sortBy = "published";
        keyword = keyword.substring(1);
    }

    // デバッグ用通信テスト
    if (keyword == "test") {
        result.VideoInfo = new Array();
        var v = { attr: 2, id: "test" };
        v.Title = "Connection Test";
        var check = GetContents(INSTANCE_URL + "/feeds/api/videos?q=test&max-results=1&v=2");
        if (check && check.length > 0) {
            v.Description = "OK: Connected";
        } else {
            v.Description = "FAILED: Connection Error";
        }
        v.URL = "";
        result.VideoInfo.push(v);
        result.end = 1;
        result.total = 1;
        return result;
    }

    // 検索API呼び出し
    var apiUrl = INSTANCE_URL + '/feeds/api/videos?q=' + escape(keyword) + 
                 '&start-index=' + result.start + 
                 '&max-results=' + result.bypage + 
                 '&orderby=' + sortBy + 
                 '&racy=include&v=2&alt=xml';

    var xml = GetContents(apiUrl);
    result.VideoInfo = new Array();
    
    if (xml) {
        var entries = xml.split("<entry>");
        
        for (var i = 1; i < entries.length; i++) {
            var entry = entries[i];
            var v = { attr: 2 };

            var fullId = my_extract(entry, "<id>", "</id>");
            if (fullId == "") continue;

            var lastSlash = fullId.lastIndexOf("/");
            v.id = (lastSlash != -1) ? fullId.substring(lastSlash + 1) : fullId;

            v.Title = my_extract(entry, "<title type='text'>", "</title>");
            var durStr = my_extract(entry, "duration='", "'");
            v.LengthSeconds = parseInt(durStr);
            if (isNaN(v.LengthSeconds)) v.LengthSeconds = 0;

            var author = my_extract(entry, "<name>", "</name>");
            v.Description = "Author: " + author;
            v.ThumbnailURL = 'http://i.ytimg.com/vi/' + v.id + '/hqdefault.jpg';
            
            v.SaveFilename = v.id + ".flv";
            
            v.URL = 'YT2009.play("' + v.id + '")';
            result.VideoInfo.push(v);
        }
    }

    if (result.VideoInfo.length > 0) {
        result.end = result.start - 1 + result.VideoInfo.length;
        result.total = result.start + 100;
    } else {
        var err = { attr: 2, id: "error" };
        err.Title = "No Results Found";
        err.Description = "URL: " + INSTANCE_URL;
        err.URL = "";
        result.VideoInfo.push(err);
        result.end = 1;
        result.total = 1;
    }
    
    return result;
};

YT2009.play = function (id) {
    // 事前ロード 
    var watchUrl = INSTANCE_URL + "/watch?v=" + id;
    var dummy = GetContents(watchUrl);
    
    // サーバーに送るURL
    return INSTANCE_URL + "/assets/" + id + ".flv";
};

SiteList.push(YT2009);