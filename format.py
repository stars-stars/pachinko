from bs4 import BeautifulSoup
import re
import datetime


# 現在の収支を調べる
soup = BeautifulSoup(open("diary.html", encoding="utf-8"), "html.parser")
div_list = soup.find("div", class_="diary").contents
div_list = div_list[1::2]
print(div_list[0].contents[3::2])