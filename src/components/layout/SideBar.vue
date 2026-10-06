<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMenu, ElMenuItem, ElSubMenu } from 'element-plus'
const props = defineProps({ menus: { type: Object, default: () => ({}) }, collapse: Boolean })
const emit = defineEmits(['navigate'])
const route = useRoute(), router = useRouter()
const groups = computed(() => Object.values(props.menus).filter(g => g.items?.length))
const active = computed(() => groups.value.flatMap(g => g.items).filter(i => route.path.startsWith(i.url)).sort((a, b) => b.url.length - a.url.length)[0]?.url || route.path)
async function select(path) { await router.push(path); emit('navigate') }
</script>
<template><nav aria-label="主导航"><ElMenu :default-active="active" :collapse="collapse" :default-openeds="groups.map(g => g.name)" @select="select">
  <template v-for="group in groups" :key="group.name">
    <ElSubMenu v-if="group.items.length > 1" :index="group.name"><template #title>{{ group.name }}</template><ElMenuItem v-for="item in group.items" :key="item.url" :index="item.url">{{ item.name }}</ElMenuItem></ElSubMenu>
    <ElMenuItem v-else :index="group.items[0].url"><template #title>{{ group.items[0].name }}</template></ElMenuItem>
  </template>
</ElMenu></nav></template>
