// utils/holidays.js - 前端节假日工具
// 从后端获取节假日/节气/节日信息，缓存到storage

const CACHE_KEY = 'holidays_cache_v2';

/**
 * 获取某月的节假日数据
 * 缓存到该年12月31日过期
 */
async function getMonthHolidays(year, month) {
  const app = getApp();
  const expireTime = new Date(year, 11, 31, 23, 59, 59).getTime();
  const cacheKey = `holidays_${year}_${month}`;
  const cached = wx.getStorageSync(cacheKey);
  if (cached && cached.expire > Date.now() && cached.version === 2) {
    return cached.data;
  }
  
  try {
    const res = await app.request({
      url: '/holidays/month',
      data: { year, month }
    });
    
    if (res.success) {
      wx.setStorageSync(cacheKey, { data: res.data, expire: expireTime, version: 2 });
      return res.data;
    }
  } catch (err) {
    console.error('获取节假日失败:', err);
  }
  
  return {};
}

/**
 * 解析某日的标签信息
 * 
 * 返回结构：
 * {
 *   cornerTag: '休' / '班' / null  — 放在日期数字右上角的小角标
 *   cornerClass: 'rest-tag' / 'work-tag' / null
 *   mainLabel: '端午' / '芒种' / '母亲节' / null  — 日期下方主标签
 *   mainClass: 'holiday-text' / 'term-text' / 'festival-text' / null
 *   subLabel: '夏至' / '父亲节' / null  — 主标签下方的副标签（同一天有节气+节日时）
 *   subClass: 'term-text' / 'festival-text' / null
 * }
 */
function getDayLabels(dateStr, monthHolidays) {
  const info = monthHolidays[dateStr];
  if (!info) return null;
  
  let cornerTag = null, cornerClass = null;
  let mainLabel = null, mainClass = null;
  let subLabel = null, subClass = null;
  
  // 放假日/补班 → 右上角角标
  if (info.holiday === true) {
    if (info.wage === 3) {
      // 核心假日日：角标显示"休"，下方显示节日名
      cornerTag = '休';
      cornerClass = 'rest-tag';
      const name = info.holidayName || '';
      if (name.includes('除夕')) mainLabel = '除夕';
      else if (name.includes('初')) mainLabel = '春节';
      else if (name.includes('清明')) mainLabel = '清明';
      else if (name.includes('劳动')) mainLabel = '劳动节';
      else if (name.includes('端午')) mainLabel = '端午';
      else if (name.includes('中秋')) mainLabel = '中秋';
      else if (name.includes('国庆')) mainLabel = '国庆';
      else if (name.includes('元旦')) mainLabel = '元旦';
      else mainLabel = name;
      mainClass = 'holiday-text';
    } else {
      // 调休日：右上角显示"休"，下方不显示
      cornerTag = '休';
      cornerClass = 'rest-tag';
    }
  } else if (info.holiday === false) {
    // 补班：右上角显示"班"
    cornerTag = '班';
    cornerClass = 'work-tag';
  }
  
  // 节气
  if (info.term) {
    if (mainLabel) {
      // 已有主标签(假日名)，节气作为副标签
      subLabel = info.term;
      subClass = 'term-text';
    } else {
      mainLabel = info.term;
      mainClass = 'term-text';
    }
  }
  
  // 纪念日
  if (info.festival) {
    if (mainLabel) {
      if (!subLabel) {
        subLabel = info.festival;
        subClass = 'festival-text';
      }
    } else {
      mainLabel = info.festival;
      mainClass = 'festival-text';
    }
  }
  
  if (!cornerTag && !mainLabel) return null;
  
  return { cornerTag, cornerClass, mainLabel, mainClass, subLabel, subClass };
}

module.exports = { getMonthHolidays, getDayLabels };
