# homebridge-mi-humidifier
A Xiaomi Mi humidifier plugin for Homebridge.

# Example config

```
{
  "bridge": {
    "name": "Homebridge",
    "username": "CC:22:3D:E4:CE:30",
    "port": 51826,
    "pin": "031-45-154"
  },
  "platforms": [],
  "accessories": [
    {
      "accessory": "MiHumidifier",
      "name": "Bedroom Humidifier",
      "ip": "192.168.x.x",
      "token": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      "showTemperature": true,
      "nameTemperature": "Bedroom Temperature 1"
    }
  ]
}
```
