## SQL

- 查询日浏览量
wrangler d1 execute req_limit --remote --command="select *from stat where id=4328"

- 总浏览量
 wrangler d1 execute req_limit --remote --command="select *from stat where ip=''"