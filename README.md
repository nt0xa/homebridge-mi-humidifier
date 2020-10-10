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
          "address": "192.168.86.31",
          "token": "93db466137accd4c9c6204315c542f9c",
          "model": "zhimi.humidifier.v1",
          "temperatureSensor": {
            "enabled": true,
            "name": "Temperature"
          },
          "humiditySensor": {
            "enabled": true,
            "name": "Humidity"
          },
          "ledBulb": {
            "enabled": true,
            "name": "Led backlight"
          },
          "buzzerSwitch": {
            "enabled": true,
            "name": "Buzzer"
          }
        }
      ]
    }
  ],
  "accessories": []
}
```

### Humidifier configuration

- `address` – device IP address;
- `token` – device token (32 hex chars);
- `model` – the model of a humidifier. Default is 'zhimi.humidifier.v1';
- `name` – device name. Default is 'Humidifier';
- `temperatureSensor.enabled` — if `true`, the temperature sensor will be added. Default is `false`;
- `temperatureSensor.name` — temperature sensor name. Default is 'Temperature';
- `humiditySensor.enabled` — if `true`, the humidity sensor will be added. Default is `false`;
- `humiditySensor.name` — humidity sensor name. Default is 'Humidity';
- `ledBulb.enabled` — if `true`, the led backlight bulb will be added. Default is `false`;
- `ledBulb.name` — led backlight bulb name. Default is 'Buzzer';
- `buzzerSwitch.enabled` — if `true`, the buzzer switch will be added. Default is `false`;
- `buzzerSwitch.name` — buzzer switch name. Default is 'Buzzer';
