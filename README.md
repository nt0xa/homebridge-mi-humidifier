# homebridge-mi-humidifier

[![version](https://img.shields.io/npm/v/homebridge-mi-humidifier.svg)](https://www.npmjs.com/package/homebridge-mi-humidifier)
![downloads](https://img.shields.io/npm/dt/homebridge-mi-humidifier.svg)

A Xiaomi Mi humidifier plugin for Homebridge.

### Example config

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
      "nameTemperature": "Bedroom Temperature 1",
      "showHumidity": false
    }
  ]
}
```

### Humidifier configuration

- `ip` – device IP address;
- `token` – device token (32 hex chars);
- `model` – the model of a humidifier (`v1` for Smartmi Humidifier, `ca1` or `cb1` for Smartmi Evaporative Humidifier);
- `name` (optional) – device name. Default is 'Humidifier';
- `showTemperature` (optional) – if `true`, the temperature sensor will be added. Default is `true`;
- `nameTemperature` (optional) – temperature sensor name. Default is 'Temperature';
- `showHumidity` (optional) – if `true`, the humidity sensor will be added. Default is `true`;
- `nameHumidity` (optional) – humidity sensor name. Default is 'Humidity'.
