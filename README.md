# TeleProxy

Simple Decentralized Socks5 Proxy Cluster

Allows creating a private/public proxy or proxy clusters.

Works well for Telegram.

If you feel gorgeous to support us with BTC: *1GramMuayf72r954ZFDzG7umhDPyG4fPWs* or by creating an Autonomous Proxy Node on your own server.

## Installing an Autonomous Proxy Node.

For the first you need to install:
* Nginx: https://www.digitalocean.com/community/tutorials/how-to-install-nginx-on-ubuntu-16-04
* NodeJS: https://www.digitalocean.com/community/tutorials/how-to-install-node-js-on-ubuntu-16-04

Then open required ports:
* iptables -A INPUT -p tcp --dport 1080 -j ACCEPT
* iptables -A INPUT -p tcp --dport 6001 -j ACCEPT
* iptables -A INPUT -p tcp --dport 3001 -j ACCEPT

The next is to install app:
* wget https://github.com/smituk/teleproxy/archive/master.zip
* unzip master.zip
* cd ./teleproxy
* ./install.sh


Some of ready to use Socks proxies is here http://teleproxy.org:3001/

Best Regards.
