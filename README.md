# homebridge-mi-humidifier

![version](https://img.shields.io/npm/v/homebridge-mi-humidifier.svg)
![downloads](https://img.shields.io/npm/dt/homebridge-mi-humidifier.svg)

A Xiaomi Mi humidifier plugin for Homebridge.

## Example config

```json
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
      "model": "v1",
      "showTemperature": true,
      "nameTemperature": "Bedroom Temperature 1"
    }
  ]
}
```
