const socks     = require('socksv5');
const ip        = require("ip");
const WebSocket = require("ws");
const express   = require("express");

class TeleProxy {
    constructor(env) {
        this.proxy_port = env.PROXY_PORT || 1080;
        this.proxy_host = env.PROXY_HOST || ip.address() || '0.0.0.0';
        this.p2p_port   = env.P2P_PORT   || 6001;
        this.http_port  = env.HTTP_PORT  || 3001; // 80
        this.http_end   = env.HTTP_END   || '/';

        this.nodes      = [this.proxy_host];
        if(env.NODES) {
            this.nodes.push(...env.NODES.split(','));
        }

        this.sockets    = [];
        this.ws         = null;

        this.p2p_server = new WebSocket.Server({
            port    : this.p2p_port
        });

        this.karma      = {};

        this.server = socks.createServer((info, accept, deny) => {
            if(this.karma[info.srcAddr] && this.karma[info.srcAddr] > 10) {
                return deny();
            }

            if( !info || [25, 80, 443, 5222].indexOf(info.dstPort) < 0 || !/\d+\.\d+\.\d+\.\d+/.test(info.dstAddr) ) {
                // console.log('access to %s was !denied!. %j', info.dstAddr, info);
                this.karma[info.srcAddr] = (+this.karma[info.srcAddr] || 0) + 1;
                if(this.karma[info.srcAddr] > 10) {
                    // console.log('buy buy %s ...', info.srcAddr);
                }
                deny();
            }
            else {
                // console.log('access to %s is -allowed-. %j', info.dstAddr, info);
                this.karma[info.srcAddr] = (+this.karma[info.srcAddr] || 0) - 1;
                accept();
            }
        });

        this.app = express();
    }
    init() {
        this.p2p_server.on('connection', (ws, req) => {
            this.ws = ws;
            this._init_connection(this.ws, req.headers['x-forwarded-for'] || req.connection.remoteAddress || ws._socket.remoteAddress);
            this._broadcast({type : "SAWADEE", data : this.nodes});
            console.log('WS P2P server listening on %s:%s', this.proxy_host, this.p2p_port);
        });

        this.server.listen(this.proxy_port, this.proxy_host, () => {
            console.log('SOCKS server listening on %s:%s', this.proxy_host, this.proxy_port);
            this._connect_to(this.nodes);
        });

        this.server.useAuth(socks.auth.None());

        //this.server.useAuth(socks.auth.UserPassword(function(user, password, cb) {
        //    cb(user === 'smituk' && password === 'smituk');
        //}));

        this.server.on('connection', (inf) => {
            // console.log('INFO: %j', inf);
        });

        this.app.all(this.http_end, (req, res) => {
            res.send('<meta http-equiv="refresh" content="5" >'+
                '<div style="width: 60%; text-align: left; margin: 5% auto">' + this.nodes.map(n => {
                return `<h3><a href="https://t.me/socks?server=${n}&port=${this.proxy_port}">[ https://t.me/ ]</a> 
                        <a href="tg://socks?server=${n}&port=${this.proxy_port}">[ tg:// ]</a> 
                        ${n}</h3>`;
            }).join('\n') + '</div>');
        });

        this.app.listen(this.http_port, () => {
            console.log('WEB app listening on %s:%s', this.proxy_host, this.http_port)
        });

        /* setInterval(() => {
            console.log('NODES: %s', this.nodes.join(', '));
        }, 3000); */
    }
    _init_connection(ws, IP) {
        IP = IP.replace(/^\:\:ffff\:/, "");

        this.sockets.push(ws);
        ws.on('message', (data) => {
            const message = JSON.parse(data);
            // console.log('Received message' + JSON.stringify(message));

            if(IP === this.proxy_host) return;

            const new_nodes = [];
            if(this.nodes.indexOf(IP) < 0 && new_nodes.indexOf(IP) < 0) {
                if(!/127\.0\.0/.test(IP) && !/\:/.test(IP) && /\d+\.\d+\.\d+\.\d+/.test(IP)) {
                    new_nodes.push(IP);
                }
            }
            if(message.data && message.data instanceof Array) {
                message.data.forEach(item => {
                    if(this.nodes.indexOf(item) < 0 && new_nodes.indexOf(item) < 0) {
                        if(!/127\.0\.0/.test(item) && !/\:/.test(item) && /\d+\.\d+\.\d+\.\d+/.test(item)) {
                            new_nodes.push(item);
                        }
                    }
                });
            }
            this._connect_to(new_nodes);
            console.log('new NODES: %j', new_nodes);
            new_nodes.forEach(n => {
                if(this.nodes.indexOf(n) < 0) this.nodes.push(n);
            });

            switch (message.type) {
                case 'SAWADEE':
                    // console.log("IN [%s] SAWADEE FROM %s", this.proxy_host, IP);
                    this._write(ws, {type: "KHAP", nodes: this.nodes});
                break;
                case 'KHAP':
                    // console.log("IN [%s] KHAP FROM %s", this.proxy_host, IP);
                break;
            }
        });
        ws.on('close', () => this._close_connection(ws));
        ws.on('error', () => this._close_connection(ws));
    }
    _close_connection(ws) {
        console.log('connection failed to node: ' + ws.url);
        this.sockets.splice(this.sockets.indexOf(ws), 1);
    };
    _broadcast(message) {
        this.sockets.forEach(socket => this._write(socket, message));
    }
    _write(ws, message) {
        console.log("OUT [%s] TO %s > MESSAGE %j", this.proxy_host, ws._socket.remoteAddress, message);
        return ws.send(JSON.stringify(message));
    }
    _connect_to(peers, t) {
        peers.forEach((peer) => {
            if(peer === this.proxy_host) return;

            const ws = new WebSocket(`http://${peer}:${this.p2p_port}`);
            ws.on('open', () => this._init_connection(ws, peer));
            ws.on('error', () => {
                console.log('connection failed. retry...')
                if(t) return;

                setTimeout(() => {
                    this._connect_to(peers, 1);
                }, 1000 * 21);
            });
        });
    };
}

const $t = new TeleProxy(process.env);
$t.init();
