# homebridge-mi-humidifier

[![version](https://img.shields.io/npm/v/homebridge-mi-humidifier.svg)](https://www.npmjs.com/package/homebridge-mi-humidifier)
![downloads](https://img.shields.io/npm/dt/homebridge-mi-humidifier.svg)

A Xiaomi Mi humidifier plugin for Homebridge.

### Example config

```json
{
  "bridge": {
    "name": "HomebridgeTest",
    "username": "11:22:33:44:55:66",
    "port": 51826,
    "pin": "123-45-678"
  },
  "platforms": [
    {
      "platform": "MiHumidifier",
      "devices": [
        {
          "name": "Humidifier",
          "address": "<ip>",
          "token": "<token>",
          "model": "zhimi.humidifier.v1",
          "updateInterval": 30,
          "ledBulb": {
            "enabled": true,
            "name": "Humidifier LED"
          },
          "buzzerSwitch": {
            "enabled": true,
            "name": "Humidifier Buzzer"
          },
          "temperatureSensor": {
            "enabled": true,
            "name": "Humidifier Temperature"
          },
          "humiditySensor": {
            "enabled": true,
            "name": "Humidifier Humidity"
          }
        }
      ]
    }
  ]
}
```


### Humidifier configuration

- `address` – device IP address;
- `token` – device token (32 hex chars);
- `model` – the model of a humidifier, one of "zhimi.humidifier.v1", "zhimi.humidifier.ca1", "zhimi.humidifier.cb1", "zhimi.humidifier.ca4", "deerma.humidifier.mjjsq", "shuii.humidifier.jsq001". Default is "zhimi.humidifier.v1";
- `name` – device name. Default is "Humidifier";
- `ledBulb.enabled` — if `true`, the led backlight bulb will be added. Default is `false`;
- `ledBulb.name` — led backlight bulb name. Default is "Humidity LED";
- `buzzerSwitch.enabled` — if `true`, the buzzer switch will be added. Default is `false`;
- `buzzerSwitch.name` — buzzer switch name. Default is "Humidifier Buzzer";
- `temperatureSensor.enabled` — if `true`, the temperature sensor will be added. Default is `false`;
- `temperatureSensor.name` — temperature sensor name. Default is "Humidifier Temperature";
- `humiditySensor.enabled` — if `true`, the humidity sensor will be added. Default is `false`;
- `humiditySensor.name` — humidity sensor name. Default is "Humidifier Humidity";
