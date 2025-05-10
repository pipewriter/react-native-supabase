unzip app-debug.zip
adb install app-debug.apk

# A brief explanation of your data structure and approach

Got supabase authentication working. 

There's a splash page, a user page (with checkboxes and calendar notes), and an admin page that can see all the users checkboxes

## Debugging issue where the checkboxes no longer update supabase

Try some logins:
prdiard@gmail.com (ADMIN)
123456
thefloodbringer@gmail.com (USER)
123456
thelostfunctions@gmail.com (USER)
123456


# User page
![User page](Screenshot1.jpg)
# Splash Page
![Splash page](Screenshot3.jpg)
# Admin Page
![Admin page](Screenshot2.jpg)

# Performance notes or enhancements if implemented

Adding notes by Calender day does not workd