<script setup>
defineProps({ icon: [String, Object, Function] })
</script>

<template>
  <component
    v-if="icon && typeof icon !== 'string'"
    :is="icon"
    class="model-icon"
    aria-hidden="true"
  />
  <i
    v-else-if="icon && /^[a-zA-Z][\w -]*$/.test(icon)"
    :class="icon.includes(' ') ? icon : `fa fa-${icon}`"
    class="model-icon"
    aria-hidden="true"
  />
  <span
    v-else-if="icon"
    class="model-icon"
    aria-hidden="true"
    >{{ icon }}</span
  >
</template>

<style scoped>
.model-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 1.25em;
  height: 1.25em;
  margin-right: 8px;
  vertical-align: middle;
}
</style>
