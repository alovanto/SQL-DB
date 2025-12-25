Các phần 1,2,3,4+ web-app là code Sql, raw sql, ORM, SP đã dùng prepared statement, placeholder, ... đã đạt đc:
Điều kiện                   	Kết quả	                   Ghi chú
A. Prepared Statement	         ✅ ĐẠT               	Dùng whitelist cho dynamic fields
B. ORM không bị bẻ cong	       ✅ ĐẠT	              Không dùng raw query
C. SP không dynamic SQL	       ✅ ĐẠT	              Tham số trực tiếp
D. Không Second-Order	         ✅ ĐẠT	                Data không reuse vào SQL
E. Không Logic Flaw SQL	       ✅ ĐẠT	              Cơ bản ok


phần 5, web-vuln code cấu hỉnh lỗi để học khai thác sqli
