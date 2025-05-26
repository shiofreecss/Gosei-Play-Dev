import React from 'react';
import { getTimeControlDescription } from '../utils/timeUtils';

const TimeControlSettings = ({ timeControl, onChange }) => {
  const handleMainTimeChange = (e) => {
    const value = parseInt(e.target.value) || 0;
    onChange({
      ...timeControl,
      timeControl: value
    });
  };

  const handleByoYomiPeriodsChange = (e) => {
    const value = parseInt(e.target.value) || 0;
    onChange({
      ...timeControl,
      byoYomiPeriods: value
    });
  };

  const handleByoYomiTimeChange = (e) => {
    const value = parseInt(e.target.value) || 0;
    onChange({
      ...timeControl,
      byoYomiTime: value
    });
  };

  // List of preset time control options
  const presets = [
    { label: 'No time limit', value: { timeControl: 0, byoYomiPeriods: 0, byoYomiTime: 0 } },
    { label: '10 min', value: { timeControl: 10, byoYomiPeriods: 0, byoYomiTime: 0 } },
    { label: '10 min + 5×30s', value: { timeControl: 10, byoYomiPeriods: 5, byoYomiTime: 30 } },
    { label: '15 min + 5×30s', value: { timeControl: 15, byoYomiPeriods: 5, byoYomiTime: 30 } },
    { label: '30 min + 5×30s', value: { timeControl: 30, byoYomiPeriods: 5, byoYomiTime: 30 } }
  ];

  const handlePresetChange = (e) => {
    const presetIndex = parseInt(e.target.value);
    if (presetIndex >= 0) {
      onChange(presets[presetIndex].value);
    }
  };

  // Find the index of the current timeControl in the presets list, or -1 if not found
  const getCurrentPresetIndex = () => {
    return presets.findIndex(
      preset => 
        preset.value.timeControl === timeControl.timeControl &&
        preset.value.byoYomiPeriods === timeControl.byoYomiPeriods &&
        preset.value.byoYomiTime === timeControl.byoYomiTime
    );
  };

  return (
    <div className="time-control-settings">
      <div className="form-group">
        <label htmlFor="timeControlPreset">Time Control Preset:</label>
        <select 
          id="timeControlPreset" 
          value={getCurrentPresetIndex()} 
          onChange={handlePresetChange}
          className="form-control"
        >
          {presets.map((preset, index) => (
            <option key={index} value={index}>
              {preset.label}
            </option>
          ))}
          <option value={-1}>Custom</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="mainTime">Main Time (minutes):</label>
        <input
          id="mainTime"
          type="number"
          min="0"
          value={timeControl.timeControl || 0}
          onChange={handleMainTimeChange}
          className="form-control"
        />
      </div>

      <div className="form-group">
        <label htmlFor="byoYomiPeriods">Byo-Yomi Periods:</label>
        <input
          id="byoYomiPeriods"
          type="number"
          min="0"
          value={timeControl.byoYomiPeriods || 0}
          onChange={handleByoYomiPeriodsChange}
          className="form-control"
        />
      </div>

      <div className="form-group">
        <label htmlFor="byoYomiTime">Byo-Yomi Time (seconds per period):</label>
        <input
          id="byoYomiTime"
          type="number"
          min="0"
          value={timeControl.byoYomiTime || 0}
          onChange={handleByoYomiTimeChange}
          className="form-control"
        />
      </div>

      <div className="time-control-summary">
        <strong>Current Setting:</strong> {getTimeControlDescription(timeControl)}
      </div>
    </div>
  );
};

export default TimeControlSettings; 