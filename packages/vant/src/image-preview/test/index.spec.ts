import {
  mount,
  later,
  triggerDrag,
  mockGetBoundingClientRect,
  trigger,
} from '../../../test';
import { LONG_PRESS_START_TIME } from '../../utils';
import ImagePreview from '../ImagePreview';
import { images, triggerDoubleTap, triggerZoom } from './shared';
import type { ImagePreviewInstance } from '../types';

test('should swipe to current index after calling the swipeTo method', async () => {
  const wrapper = mount(ImagePreview, {
    props: {
      show: true,
      images,
    },
  });

  await later();
  (wrapper.vm as Record<string, any>).swipeTo(2);

  await later(100);
  expect(wrapper.find('.van-image-preview__index').html()).toMatchSnapshot();
});

test('should allow to use the teleport prop', () => {
  const root = document.createElement('div');
  mount(ImagePreview, {
    props: {
      show: true,
      teleport: root,
    },
  });

  expect(root.querySelector('.van-image-preview')).toBeTruthy();
});

test('should render cover slot correctly', () => {
  const wrapper = mount(ImagePreview, {
    props: {
      show: true,
    },
    slots: {
      cover: () => 'Custom Cover',
    },
  });

  expect(wrapper.html()).toMatchSnapshot();
});

test('should render index slot correctly', () => {
  const wrapper = mount(ImagePreview, {
    props: {
      show: true,
    },
    slots: {
      index: ({ index }) => `Custom Index: ${index}`,
    },
  });

  expect(wrapper.find('.van-image-preview__index').html()).toMatchSnapshot();
});

test('should render close icon when using closeable prop', () => {
  const wrapper = mount(ImagePreview, {
    props: {
      show: true,
      images,
      closeable: true,
    },
  });

  wrapper.find('.van-image-preview__close-icon').trigger('click');
  expect(wrapper.emitted<[boolean]>('update:show')![0][0]).toEqual(false);
});

test('should change close icon when using close-icon prop', () => {
  const wrapper = mount(ImagePreview, {
    props: {
      show: true,
      closeable: true,
      closeIcon: 'success',
    },
  });

  expect(
    wrapper.find('.van-image-preview__close-icon').html(),
  ).toMatchSnapshot();
});

test('should change close icon position when using close-icon-position prop', () => {
  const wrapper = mount(ImagePreview, {
    props: {
      show: true,
      closeable: true,
      closeIconPosition: 'top-left',
    },
  });

  expect(
    wrapper.find('.van-image-preview__close-icon').html(),
  ).toMatchSnapshot();
});

test('should hide index when show-index prop is false', async () => {
  const wrapper = mount(ImagePreview, {
    props: {
      show: true,
    },
  });
  expect(wrapper.find('.van-image-preview__index').exists()).toBeTruthy();

  await wrapper.setProps({ showIndex: false });
  expect(wrapper.find('.van-image-preview__index').exists()).toBeFalsy();
});

test('should hide ImagePreview after popstate', async () => {
  const wrapper = mount(ImagePreview, {
    props: {
      images,
      show: true,
    },
  });

  window.dispatchEvent(new Event('popstate'));
  expect(wrapper.emitted<[boolean]>('update:show')![0][0]).toBeFalsy();
});

test('should not hide ImagePreview after popstate when close-on-popstate is false', async () => {
  const wrapper = mount(ImagePreview, {
    props: {
      images,
      show: true,
      closeOnPopstate: false,
    },
  });

  window.dispatchEvent(new Event('popstate'));
  expect(wrapper.emitted('update:show')).toBeFalsy();
});

test('render image', async () => {
  const wrapper = mount(ImagePreview, {
    props: { images, show: true },
  });

  expect(wrapper.html()).toMatchSnapshot();

  await later();

  const swipe = wrapper.find('.van-swipe-item');
  await triggerDrag(swipe, 500, 0);
  expect(wrapper.emitted('update:show')).toBeFalsy();
  expect(wrapper.emitted('change')![0]).toEqual([2]);

  triggerDrag(swipe, 0, 0);
  await later(250);
  expect(wrapper.emitted('update:show')![0]).toEqual([false]);
});

test('before close prop', async () => {
  const wrapper = mount(ImagePreview, {
    props: {
      images,
      show: true,
      beforeClose: () => true,
    },
  });

  const swipe = wrapper.find('.van-swipe__track');

  // should not emit input or close event when tapped
  triggerDrag(swipe, 0, 0);
  await later(250);
  expect(wrapper.emitted('input')).toBeFalsy();
  expect(wrapper.emitted('close')).toBeFalsy();

  await wrapper.setProps({ show: false });
  expect(wrapper.emitted('close')![0]).toBeTruthy();
});

test('should close when overlay is clicked', async () => {
  const wrapper = mount(ImagePreview, {
    props: {
      images,
      show: true,
      'onUpdate:show': (show) => {
        wrapper.setProps({ show });
      },
    },
  });

  const swipe = wrapper.find('.van-swipe-item');

  await triggerDrag(swipe, 0, 0);
  await later(300);
  expect(wrapper.emitted('close')).toBeTruthy();
});

test('should not close when overlay is clicked and closeOnClickOverlay is false', async () => {
  const wrapper = mount(ImagePreview, {
    props: {
      images,
      show: true,
      closeOnClickOverlay: false,
      'onUpdate:show': (show) => {
        wrapper.setProps({ show });
      },
    },
  });

  const swipe = wrapper.find('.van-swipe-item');

  triggerDrag(swipe, 0, 0);
  await later(300);
  expect(wrapper.emitted('close')).toBeFalsy();
});

test('should trigger scale after double clicking', async () => {
  const onScale = vi.fn();
  const wrapper = mount(ImagePreview, {
    props: {
      images,
      show: true,
      onScale,
    },
  });

  await later();
  const swipe = wrapper.find('.van-swipe-item');

  triggerDoubleTap(swipe);
  expect(onScale).toHaveBeenCalledWith({
    index: 0,
    scale: 2,
  });

  triggerDoubleTap(swipe);
  expect(onScale).toHaveBeenLastCalledWith({
    index: 0,
    scale: 1,
  });

  // when closeOnClickOverlay is set to false, it will not affect the zooming.
  onScale.mockClear();
  await wrapper.setProps({ closeOnClickOverlay: false });
  triggerDoubleTap(swipe);
  expect(onScale).toHaveBeenCalled();
});

test('should allow to disable double click gesture', async () => {
  const onScale = vi.fn();
  const onClose = vi.fn();
  const wrapper = mount(ImagePreview, {
    props: {
      images,
      show: true,
      doubleScale: false,
      onClose,
      onScale,
      'onUpdate:show': (show) => {
        wrapper.setProps({ show });
      },
    },
  });

  // The ImagePreview will close because double-click is disabled.
  await later();
  const swipe = wrapper.find('.van-swipe-item');
  await triggerDoubleTap(swipe);
  expect(onClose).toHaveBeenCalled();
  expect(onScale).not.toHaveBeenCalled();

  // The ImagePreview will not close when closeOnClickOverlay is set to false.
  onClose.mockClear();
  await wrapper.setProps({ closeOnClickOverlay: false, show: true });
  await triggerDrag(swipe, 0, 0);
  expect(onClose).not.toHaveBeenCalled();
  await triggerDoubleTap(swipe, 0, 0);
  expect(onClose).not.toHaveBeenCalled();
});

test('zoom in and drag image to move', async () => {
  const restore = mockGetBoundingClientRect({ width: 100, height: 100 });

  const wrapper = mount(ImagePreview, {
    props: { images, show: true },
  });

  await later();
  const image = wrapper.find('img');
  triggerZoom(image, 300, 300);

  // mock image size
  ['naturalWidth', 'naturalHeight'].forEach((key) => {
    Object.defineProperty(image.element, key, { value: 300 });
  });

  // drag image before load
  triggerDrag(image, 300, 300);
  expect(wrapper.find('.van-image').html()).toMatchSnapshot();

  // drag image after load
  image.trigger('load');
  triggerDrag(image, 300, 300);
  expect(wrapper.find('.van-image').html()).toMatchSnapshot();

  restore();
});

test('zoom out', async () => {
  const restore = mockGetBoundingClientRect({ width: 100, height: 100 });

  const onScale = vi.fn();
  const wrapper = mount(ImagePreview, {
    props: {
      images,
      show: true,
      onScale,
    },
  });

  await later();
  const image = wrapper.find('.van-image');
  triggerZoom(image, 300, 300, 'out');

  expect(onScale).toHaveBeenLastCalledWith({ index: 0, scale: 1 });

  restore();
});

test('should render image slot correctly', async () => {
  const wrapper = mount(ImagePreview, {
    props: {
      show: true,
      images,
    },
    slots: {
      image: ({ src }) => `<img class="test-img" src="${src}" />`,
    },
  });

  await later();

  expect(wrapper.html().includes('test-img')).toBeTruthy();
});

test('should render image slot correctly 2', async () => {
  const wrapper = mount(ImagePreview, {
    props: {
      show: true,
      images,
    },
    slots: {
      image: ({ src }) =>
        `<video style="width: 100%;" controls><source src="${src}" /></video>`,
    },
  });

  await later();

  expect(wrapper.html().includes('video')).toBeTruthy();
});

test('should emit long-press event after long press', async () => {
  const onLongPress = vi.fn();
  const wrapper = mount(ImagePreview, {
    props: {
      images,
      show: true,
      onLongPress,
    },
  });

  await later();
  const swipe = wrapper.find('.van-swipe-item');
  trigger(swipe, 'touchstart', 0, 0, { x: 0, y: 0 });
  await later(LONG_PRESS_START_TIME + 100);
  trigger(swipe, 'touchend', 0, 0, { touchList: [] });

  expect(onLongPress).toHaveBeenLastCalledWith({
    index: 0,
  });
});

test('should reset scale after calling the resetScale method', async () => {
  const wrapper = mount(ImagePreview, {
    props: {
      show: true,
      images,
    },
  });

  await later();
  const image = wrapper.find('.van-image');

  triggerZoom(image, 300, 300);
  await later();
  expect(image.style.transform).toBeTruthy();

  (wrapper.vm as ImagePreviewInstance).resetScale();
  await later();
  expect(image.style.transform).toBeFalsy();
});
